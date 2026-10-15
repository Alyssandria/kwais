import type { ConsentType, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

/** Fields the auth flow needs, including the password hash. Never returned to clients. */
const credentialsSelect = {
  id: true,
  email: true,
  passwordHash: true,
  role: true,
  status: true,
  failedLoginCount: true,
  lockedUntil: true,
} satisfies Prisma.UserSelect;

/** Fields safe to send to the signed-in user. */
const publicSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  patientProfile: {
    select: { firstName: true, lastName: true, patientCode: true, onboardingDoneAt: true },
  },
} satisfies Prisma.UserSelect;

export type UserCredentials = Prisma.UserGetPayload<{ select: typeof credentialsSelect }>;
export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicSelect }>;

export interface NewPatient {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  patientCode: string;
  consents: { type: ConsentType; granted: boolean }[];
  policyVersion: string;
}

export const UserModel = {
  findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return prisma.user.findUnique({ where: { email }, select: credentialsSelect });
  },

  findCredentialsById(id: string): Promise<UserCredentials | null> {
    return prisma.user.findUnique({ where: { id }, select: credentialsSelect });
  },

  findPublicById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({ where: { id }, select: publicSelect });
  },

  emailExists(email: string): Promise<boolean> {
    return prisma.user.count({ where: { email } }).then((n) => n > 0);
  },

  patientCodeExists(code: string): Promise<boolean> {
    return prisma.patientProfile.count({ where: { patientCode: code } }).then((n) => n > 0);
  },

  /** Creates the user, their patient profile and their consent records in one transaction. */
  createPatient(input: NewPatient): Promise<PublicUser> {
    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: 'patient',
        patientProfile: {
          create: { firstName: input.firstName, lastName: input.lastName, patientCode: input.patientCode },
        },
        consents: {
          create: input.consents.map((c) => ({
            consentType: c.type,
            granted: c.granted,
            policyVersion: input.policyVersion,
          })),
        },
      },
      select: publicSelect,
    });
  },

  recordFailedLogin(id: string, failedLoginCount: number, lockedUntil: Date | null) {
    return prisma.user.update({ where: { id }, data: { failedLoginCount, lockedUntil } });
  },

  recordSuccessfulLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    });
  },
};
