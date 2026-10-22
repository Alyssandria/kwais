import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { signAccessToken } from '../lib/jwt.js';
import { getDummyHash, hashPassword, verifyPassword } from '../lib/password.js';
import { generatePatientCode, randomToken, sha256 } from '../lib/tokens.js';
import { PasswordResetModel } from '../models/password-reset.model.js';
import { RefreshTokenModel } from '../models/refresh-token.model.js';
import { UserModel, type PublicUser } from '../models/user.model.js';
import { AuditService, type RequestMeta } from './audit.service.js';
import { MailService } from './mail.service.js';

export const POLICY_VERSION = '2026-10';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'doctor';
  firstName: string | null;
  lastName: string | null;
  patientCode: string | null;
  onboardingComplete: boolean;
}

export interface Session {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export function toAuthUser(u: PublicUser): AuthUser {
  const names = u.patientProfile ?? u.doctorProfile;
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    firstName: names?.firstName ?? null,
    lastName: names?.lastName ?? null,
    patientCode: u.patientProfile?.patientCode ?? null,
    onboardingComplete: u.role === 'doctor' || Boolean(u.patientProfile?.onboardingDoneAt),
  };
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

async function issueSession(user: PublicUser, family: string = randomUUID()): Promise<Session> {
  const refreshToken = randomToken();
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await RefreshTokenModel.create({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    family,
    expiresAt: refreshTokenExpiresAt,
  });
  return {
    user: toAuthUser(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, env.ACCESS_TOKEN_TTL_SECONDS),
    accessTokenExpiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

async function uniquePatientCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generatePatientCode();
    if (!(await UserModel.patientCodeExists(code))) return code;
  }
  throw new Error('Could not generate a unique patient code');
}

export async function verifyCurrentPassword(userId: string, password: string): Promise<void> {
  const creds = await UserModel.findCredentialsById(userId);
  if (!creds) throw HttpError.unauthorized();
  if (!(await verifyPassword(password, creds.passwordHash))) {
    throw new HttpError(400, 'invalid_password', 'That password is not correct.');
  }
}

interface AccountInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: true;
}

export type RegisterInput =
  | (AccountInput & { role?: 'patient'; acceptHealthData: true })
  | (AccountInput & { role: 'doctor'; prcLicense?: string | null; specialty?: string | null; clinic?: string | null });

export const AuthService = {
  async register(input: RegisterInput, meta: RequestMeta): Promise<Session> {
    const email = normaliseEmail(input.email);
    if (await UserModel.emailExists(email)) {
      throw HttpError.conflict('An account with this email already exists. Try signing in instead.');
    }
    const account = {
      email,
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      policyVersion: POLICY_VERSION,
    };
    const user =
      input.role === 'doctor'
        ? await UserModel.createDoctor({ ...account, prcLicense: input.prcLicense ?? null, specialty: input.specialty ?? null, clinic: input.clinic ?? null })
        : await UserModel.createPatient({
            ...account,
            patientCode: await uniquePatientCode(),
            consents: [
              { type: 'terms', granted: input.acceptTerms },
              { type: 'health_data', granted: input.acceptHealthData },
            ],
          });
    await AuditService.record('create', 'user', meta, { actorId: user.id, actorRole: user.role, resourceId: user.id });
    return issueSession(user);
  },

  async login(emailRaw: string, password: string, meta: RequestMeta): Promise<Session> {
    const email = normaliseEmail(emailRaw);
    const creds = await UserModel.findCredentialsByEmail(email);
    const invalid = new HttpError(401, 'invalid_credentials', 'Email or password is incorrect.');

    if (!creds) {
      await verifyPassword(password, await getDummyHash());
      await AuditService.record('login_failed', 'user', meta);
      throw invalid;
    }

    if (creds.lockedUntil && creds.lockedUntil > new Date()) {
      await AuditService.record('login_failed', 'user', meta, { resourceId: creds.id });
      throw new HttpError(429, 'too_many_attempts', `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes.`);
    }

    if (!(await verifyPassword(password, creds.passwordHash))) {
      const failed = creds.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await UserModel.recordFailedLogin(creds.id, lock ? 0 : failed, lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null);
      await AuditService.record('login_failed', 'user', meta, { resourceId: creds.id });
      if (lock) {
        throw new HttpError(429, 'too_many_attempts', `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes.`);
      }
      throw invalid;
    }

    if (creds.status !== 'active') {
      throw new HttpError(403, 'account_inactive', 'This account is not active. Contact support for help.');
    }

    await UserModel.recordSuccessfulLogin(creds.id);
    await AuditService.record('login', 'user', meta, { actorId: creds.id, actorRole: creds.role, resourceId: creds.id });
    const user = await UserModel.findPublicById(creds.id);
    if (!user) throw invalid;
    return issueSession(user);
  },

  async refresh(rawToken: string | undefined, meta: RequestMeta): Promise<Session> {
    const expired = new HttpError(401, 'session_expired', 'Your session has ended. Please sign in again.');
    if (!rawToken) throw expired;

    const stored = await RefreshTokenModel.findByHash(sha256(rawToken));
    if (!stored) throw expired;

    // A rotated token came back: treat it as stolen and end the whole chain.
    if (stored.revokedAt) {
      await RefreshTokenModel.revokeFamily(stored.family);
      await AuditService.record('access_denied', 'refresh_token', meta, { actorId: stored.userId, resourceId: stored.id });
      throw expired;
    }
    if (stored.expiresAt <= new Date()) throw expired;

    const user = await UserModel.findPublicById(stored.userId);
    if (!user || user.status !== 'active') throw expired;

    await RefreshTokenModel.revoke(stored.id);
    return issueSession(user, stored.family);
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const stored = await RefreshTokenModel.findByHash(sha256(rawToken));
    if (stored) await RefreshTokenModel.revokeFamily(stored.family);
  },

  async forgotPassword(emailRaw: string, meta: RequestMeta): Promise<void> {
    const creds = await UserModel.findCredentialsByEmail(normaliseEmail(emailRaw));
    if (!creds || creds.status !== 'active') return;

    await PasswordResetModel.invalidateAllForUser(creds.id);
    const token = randomToken();
    await PasswordResetModel.create({
      userId: creds.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000),
    });
    const user = await UserModel.findPublicById(creds.id);
    await MailService.sendPasswordReset(creds.email, user ? (toAuthUser(user).firstName ?? undefined) : undefined, token, env.PASSWORD_RESET_TTL_MINUTES);
    await AuditService.record('update', 'password_reset_request', meta, { actorId: creds.id, resourceId: creds.id });
  },

  async resetPassword(token: string, newPassword: string, meta: RequestMeta): Promise<void> {
    const invalid = new HttpError(400, 'invalid_reset_link', 'This reset link is invalid or has expired. Request a new one.');
    const reset = await PasswordResetModel.findByHash(sha256(token));
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) throw invalid;

    await UserModel.updatePassword(reset.userId, await hashPassword(newPassword));
    await PasswordResetModel.invalidateAllForUser(reset.userId);
    await RefreshTokenModel.revokeAllForUser(reset.userId);
    await AuditService.record('update', 'password', meta, { actorId: reset.userId, resourceId: reset.userId });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string, meta: RequestMeta): Promise<Session> {
    await verifyCurrentPassword(userId, currentPassword);
    if (currentPassword === newPassword) {
      throw new HttpError(400, 'same_password', 'Choose a password that is different from your current one.');
    }
    await UserModel.updatePassword(userId, await hashPassword(newPassword));
    await PasswordResetModel.invalidateAllForUser(userId);
    await RefreshTokenModel.revokeAllForUser(userId);
    await AuditService.record('update', 'password', meta, { actorId: userId, resourceId: userId });
    const user = await UserModel.findPublicById(userId);
    if (!user) throw HttpError.unauthorized();
    return issueSession(user);
  },

  async logoutEverywhere(userId: string, meta: RequestMeta): Promise<void> {
    await RefreshTokenModel.revokeAllForUser(userId);
    await AuditService.record('update', 'sessions', meta, { actorId: userId, resourceId: userId });
  },

  async me(userId: string): Promise<AuthUser> {
    const user = await UserModel.findPublicById(userId);
    if (!user) throw HttpError.unauthorized();
    return toAuthUser(user);
  },
};
