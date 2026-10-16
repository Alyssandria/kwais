import type { DialysisStatus, Prisma, ValueSource } from '@prisma/client';
import { prisma } from '../config/db.js';

const profileSelect = {
  id: true,
  patientCode: true,
  firstName: true,
  lastName: true,
  birthYear: true,
  sex: true,
  dietaryPreferences: true,
  allergies: true,
  restrictions: true,
  ckdStage: true,
  ckdStageSource: true,
  dialysisStatus: true,
  onboardingStep: true,
  onboardingDoneAt: true,
  reminderTime: true,
  timezone: true,
  updatedAt: true,
} satisfies Prisma.PatientProfileSelect;

export type ProfileRecord = Prisma.PatientProfileGetPayload<{ select: typeof profileSelect }>;

export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  birthYear?: number | null;
  sex?: string | null;
  dietaryPreferences?: string[];
  allergies?: string[];
  restrictions?: string[];
  ckdStage?: string | null;
  ckdStageSource?: ValueSource | null;
  dialysisStatus?: DialysisStatus;
  onboardingStep?: number;
  onboardingDoneAt?: Date | null;
  reminderTime?: string | null;
}

export const PatientProfileModel = {
  async findIdByUserId(userId: string): Promise<string | null> {
    const p = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });
    return p?.id ?? null;
  },

  findById(id: string): Promise<ProfileRecord | null> {
    return prisma.patientProfile.findUnique({ where: { id }, select: profileSelect });
  },

  withReminderTime(): Promise<{ id: string; userId: string; reminderTime: string; timezone: string }[]> {
    return prisma.patientProfile
      .findMany({ where: { reminderTime: { not: null } }, select: { id: true, userId: true, reminderTime: true, timezone: true } })
      .then((rows) => rows.map((r) => ({ ...r, reminderTime: r.reminderTime! })));
  },

  update(id: string, data: ProfileChanges): Promise<ProfileRecord> {
    return prisma.patientProfile.update({ where: { id }, data, select: profileSelect });
  },
};
