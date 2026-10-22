import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

const select = {
  firstName: true,
  lastName: true,
  prcLicense: true,
  specialty: true,
  clinic: true,
  updatedAt: true,
} satisfies Prisma.DoctorProfileSelect;

export type DoctorProfileRecord = Prisma.DoctorProfileGetPayload<{ select: typeof select }>;
export type DoctorProfileChanges = Partial<Omit<DoctorProfileRecord, 'updatedAt'>>;

export const DoctorProfileModel = {
  findByUserId(userId: string): Promise<DoctorProfileRecord | null> {
    return prisma.doctorProfile.findUnique({ where: { userId }, select });
  },

  update(userId: string, data: DoctorProfileChanges): Promise<DoctorProfileRecord> {
    return prisma.doctorProfile.update({ where: { userId }, data, select });
  },
};
