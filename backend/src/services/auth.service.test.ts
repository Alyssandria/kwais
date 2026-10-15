import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/user.model.js', () => ({
  UserModel: {
    findCredentialsByEmail: vi.fn(),
    findCredentialsById: vi.fn(),
    findPublicById: vi.fn(),
    emailExists: vi.fn(),
    patientCodeExists: vi.fn(),
    createPatient: vi.fn(),
    recordFailedLogin: vi.fn(),
    recordSuccessfulLogin: vi.fn(),
    updatePassword: vi.fn(),
  },
}));
vi.mock('../models/refresh-token.model.js', () => ({
  RefreshTokenModel: {
    create: vi.fn(),
    findByHash: vi.fn(),
    revoke: vi.fn(),
    revokeFamily: vi.fn(),
    revokeAllForUser: vi.fn(),
  },
}));
vi.mock('../models/password-reset.model.js', () => ({
  PasswordResetModel: { create: vi.fn(), findByHash: vi.fn(), markUsed: vi.fn(), invalidateAllForUser: vi.fn() },
}));
vi.mock('../models/audit.model.js', () => ({ AuditModel: { create: vi.fn() } }));

const { AuthService } = await import('./auth.service.js');
const { UserModel } = await import('../models/user.model.js');
const { RefreshTokenModel } = await import('../models/refresh-token.model.js');
const { PasswordResetModel } = await import('../models/password-reset.model.js');
const { hashPassword } = await import('../lib/password.js');
const { verifyAccessToken } = await import('../lib/jwt.js');
const { sha256 } = await import('../lib/tokens.js');

const meta = { ipHash: 'abc', userAgent: 'vitest' };
const publicUser = {
  id: 'u1',
  email: 'maria@example.com',
  role: 'patient' as const,
  status: 'active' as const,
  createdAt: new Date(),
  patientProfile: { firstName: 'Maria', lastName: 'Santos', patientCode: 'KW-000123', onboardingDoneAt: null },
};

beforeEach(() => vi.clearAllMocks());

describe('register', () => {
  it('creates a patient with consents and returns a session', async () => {
    vi.mocked(UserModel.emailExists).mockResolvedValue(false);
    vi.mocked(UserModel.patientCodeExists).mockResolvedValue(false);
    vi.mocked(UserModel.createPatient).mockResolvedValue(publicUser);

    const s = await AuthService.register(
      { email: ' Maria@Example.com ', password: 'kidney-care-2026', firstName: 'Maria', lastName: 'Santos', acceptTerms: true, acceptHealthData: true },
      meta,
    );

    const created = vi.mocked(UserModel.createPatient).mock.calls[0]![0];
    expect(created.email).toBe('maria@example.com');
    expect(created.passwordHash).toMatch(/^scrypt\$/);
    expect(created.consents.map((c) => c.type)).toEqual(['terms', 'health_data']);
    expect(created.patientCode).toMatch(/^KW-\d{6}$/);
    expect(s.user).toMatchObject({ firstName: 'Maria', patientCode: 'KW-000123', onboardingComplete: false });
    expect(verifyAccessToken(s.accessToken, process.env.JWT_ACCESS_SECRET!)).toEqual({ sub: 'u1', role: 'patient' });
    expect(RefreshTokenModel.create).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: sha256(s.refreshToken) }));
  });

  it('refuses a duplicate email', async () => {
    vi.mocked(UserModel.emailExists).mockResolvedValue(true);
    await expect(
      AuthService.register(
        { email: 'maria@example.com', password: 'kidney-care-2026', firstName: 'M', lastName: 'S', acceptTerms: true, acceptHealthData: true },
        meta,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('login', () => {
  const creds = async (over = {}) => ({
    id: 'u1',
    email: 'maria@example.com',
    passwordHash: await hashPassword('kidney-care-2026'),
    role: 'patient' as const,
    status: 'active' as const,
    failedLoginCount: 0,
    lockedUntil: null,
    ...over,
  });

  it('signs in with the right password', async () => {
    vi.mocked(UserModel.findCredentialsByEmail).mockResolvedValue(await creds());
    vi.mocked(UserModel.findPublicById).mockResolvedValue(publicUser);
    const s = await AuthService.login('maria@example.com', 'kidney-care-2026', meta);
    expect(s.user.id).toBe('u1');
    expect(UserModel.recordSuccessfulLogin).toHaveBeenCalledWith('u1');
  });

  it('gives the same error for an unknown email and a wrong password', async () => {
    vi.mocked(UserModel.findCredentialsByEmail).mockResolvedValue(null);
    const a = await AuthService.login('nobody@example.com', 'whatever-123', meta).catch((e) => e);
    vi.mocked(UserModel.findCredentialsByEmail).mockResolvedValue(await creds());
    const b = await AuthService.login('maria@example.com', 'wrong-pass-123', meta).catch((e) => e);
    expect(a.code).toBe('invalid_credentials');
    expect(b.code).toBe('invalid_credentials');
    expect(a.message).toBe(b.message);
  });

  it('locks the account on the fifth wrong password', async () => {
    vi.mocked(UserModel.findCredentialsByEmail).mockResolvedValue(await creds({ failedLoginCount: 4 }));
    await expect(AuthService.login('maria@example.com', 'wrong-pass-123', meta)).rejects.toMatchObject({ status: 429 });
    const [, count, lockedUntil] = vi.mocked(UserModel.recordFailedLogin).mock.calls[0]!;
    expect(count).toBe(0);
    expect(lockedUntil).toBeInstanceOf(Date);
  });

  it('refuses a locked account even with the right password', async () => {
    vi.mocked(UserModel.findCredentialsByEmail).mockResolvedValue(await creds({ lockedUntil: new Date(Date.now() + 60_000) }));
    await expect(AuthService.login('maria@example.com', 'kidney-care-2026', meta)).rejects.toMatchObject({ status: 429 });
  });
});

describe('refresh', () => {
  it('rotates a valid token in the same family', async () => {
    vi.mocked(RefreshTokenModel.findByHash).mockResolvedValue({
      id: 'rt1', userId: 'u1', family: 'fam-1', expiresAt: new Date(Date.now() + 86_400_000), revokedAt: null,
    });
    vi.mocked(UserModel.findPublicById).mockResolvedValue(publicUser);
    const s = await AuthService.refresh('old-token', meta);
    expect(RefreshTokenModel.revoke).toHaveBeenCalledWith('rt1');
    expect(RefreshTokenModel.create).toHaveBeenCalledWith(expect.objectContaining({ family: 'fam-1' }));
    expect(s.refreshToken).not.toBe('old-token');
  });

  it('revokes the whole family when a used token is replayed', async () => {
    vi.mocked(RefreshTokenModel.findByHash).mockResolvedValue({
      id: 'rt1', userId: 'u1', family: 'fam-1', expiresAt: new Date(Date.now() + 86_400_000), revokedAt: new Date(),
    });
    await expect(AuthService.refresh('stolen', meta)).rejects.toMatchObject({ status: 401 });
    expect(RefreshTokenModel.revokeFamily).toHaveBeenCalledWith('fam-1');
    expect(RefreshTokenModel.create).not.toHaveBeenCalled();
  });

  it('rejects a missing cookie', async () => {
    await expect(AuthService.refresh(undefined, meta)).rejects.toMatchObject({ code: 'session_expired' });
  });
});

describe('password reset', () => {
  it('does nothing visible for an unknown email', async () => {
    vi.mocked(UserModel.findCredentialsByEmail).mockResolvedValue(null);
    await expect(AuthService.forgotPassword('nobody@example.com', meta)).resolves.toBeUndefined();
    expect(PasswordResetModel.create).not.toHaveBeenCalled();
  });

  it('changes the password and signs out every device', async () => {
    vi.mocked(PasswordResetModel.findByHash).mockResolvedValue({
      id: 'pr1', userId: 'u1', expiresAt: new Date(Date.now() + 60_000), usedAt: null,
    });
    await AuthService.resetPassword('a'.repeat(43), 'new-password-2026', meta);
    expect(UserModel.updatePassword).toHaveBeenCalledWith('u1', expect.stringMatching(/^scrypt\$/));
    expect(RefreshTokenModel.revokeAllForUser).toHaveBeenCalledWith('u1');
  });

  it('rejects a used link', async () => {
    vi.mocked(PasswordResetModel.findByHash).mockResolvedValue({
      id: 'pr1', userId: 'u1', expiresAt: new Date(Date.now() + 60_000), usedAt: new Date(),
    });
    await expect(AuthService.resetPassword('a'.repeat(43), 'new-password-2026', meta)).rejects.toMatchObject({
      code: 'invalid_reset_link',
    });
  });
});
