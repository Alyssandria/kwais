import type { CareLinkStatus, CareParty, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

const doctorSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  prcLicense: true,
  specialty: true,
  clinic: true,
} satisfies Prisma.DoctorProfileSelect;

const patientSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  patientCode: true,
  ckdStage: true,
  ckdStageSource: true,
  dialysisStatus: true,
  timezone: true,
} satisfies Prisma.PatientProfileSelect;

const linkSelect = {
  id: true,
  status: true,
  initiatedBy: true,
  message: true,
  createdAt: true,
  respondedAt: true,
  endedAt: true,
  endedBy: true,
  doctor: { select: doctorSelect },
  patient: { select: patientSelect },
} satisfies Prisma.CareLinkSelect;

const inviteSelect = {
  id: true,
  patientId: true,
  email: true,
  message: true,
  createdAt: true,
  expiresAt: true,
  claimedAt: true,
  cancelledAt: true,
  patient: { select: patientSelect },
} satisfies Prisma.CareInviteSelect;

export type CareDoctor = Prisma.DoctorProfileGetPayload<{ select: typeof doctorSelect }>;
export type CarePatient = Prisma.PatientProfileGetPayload<{ select: typeof patientSelect }>;
export type CareLinkRecord = Prisma.CareLinkGetPayload<{ select: typeof linkSelect }>;
export type CareInviteRecord = Prisma.CareInviteGetPayload<{ select: typeof inviteSelect }>;

const OPEN: CareLinkStatus[] = ['pending', 'active'];

export const CareModel = {
  doctorByUserId(userId: string): Promise<CareDoctor | null> {
    return prisma.doctorProfile.findUnique({ where: { userId }, select: doctorSelect });
  },

  doctorByEmail(email: string): Promise<CareDoctor | null> {
    return prisma.doctorProfile.findFirst({ where: { user: { email, status: 'active' } }, select: doctorSelect });
  },

  patientByUserId(userId: string): Promise<CarePatient | null> {
    return prisma.patientProfile.findUnique({ where: { userId }, select: patientSelect });
  },

  patientByCode(code: string): Promise<CarePatient | null> {
    return prisma.patientProfile.findFirst({ where: { patientCode: code, user: { status: 'active' } }, select: patientSelect });
  },

  findOpenBetween(patientId: string, doctorId: string): Promise<CareLinkRecord | null> {
    return prisma.careLink.findFirst({ where: { patientId, doctorId, status: { in: OPEN } }, select: linkSelect });
  },

  findLink(id: string): Promise<CareLinkRecord | null> {
    return prisma.careLink.findUnique({ where: { id }, select: linkSelect });
  },

  createLink(data: { patientId: string; doctorId: string; initiatedBy: CareParty; message: string | null; status?: CareLinkStatus; respondedAt?: Date }): Promise<CareLinkRecord> {
    return prisma.careLink.create({ data, select: linkSelect });
  },

  updateLink(id: string, data: { status: CareLinkStatus; respondedAt?: Date; endedAt?: Date; endedBy?: CareParty }): Promise<CareLinkRecord> {
    return prisma.careLink.update({ where: { id }, data, select: linkSelect });
  },

  linksForPatient(patientId: string): Promise<CareLinkRecord[]> {
    return prisma.careLink.findMany({ where: { patientId, status: { in: OPEN } }, orderBy: { createdAt: 'desc' }, select: linkSelect });
  },

  linksForDoctor(doctorId: string): Promise<CareLinkRecord[]> {
    return prisma.careLink.findMany({ where: { doctorId, status: { in: OPEN } }, orderBy: { createdAt: 'desc' }, select: linkSelect });
  },

  isActive(doctorId: string, patientId: string): Promise<boolean> {
    return prisma.careLink.count({ where: { doctorId, patientId, status: 'active' } }).then((n) => n > 0);
  },

  createInvite(data: { patientId: string; email: string; tokenHash: string; message: string | null; expiresAt: Date }) {
    return prisma.careInvite.create({ data, select: inviteSelect });
  },

  findInviteByHash(tokenHash: string): Promise<CareInviteRecord | null> {
    return prisma.careInvite.findUnique({ where: { tokenHash }, select: inviteSelect });
  },

  openInvitesForPatient(patientId: string, now: Date): Promise<CareInviteRecord[]> {
    return prisma.careInvite.findMany({
      where: { patientId, claimedAt: null, cancelledAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: inviteSelect,
    });
  },

  async cancelInvite(patientId: string, id: string): Promise<number> {
    const r = await prisma.careInvite.updateMany({ where: { id, patientId, claimedAt: null, cancelledAt: null }, data: { cancelledAt: new Date() } });
    return r.count;
  },

  markInviteClaimed(id: string, now: Date) {
    return prisma.careInvite.update({ where: { id }, data: { claimedAt: now }, select: { id: true } });
  },

  async claimInvite(id: string, link: { patientId: string; doctorId: string; message: string | null }, now: Date): Promise<CareLinkRecord> {
    const [, created] = await prisma.$transaction([
      prisma.careInvite.update({ where: { id }, data: { claimedAt: now } }),
      prisma.careLink.create({
        data: { ...link, initiatedBy: 'patient', status: 'active', respondedAt: now },
        select: linkSelect,
      }),
    ]);
    return created;
  },
};
