import type { ConsentType } from '@prisma/client';
import { prisma } from '../config/db.js';

export const ConsentModel = {
  listForUser(userId: string) {
    return prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { consentType: true, granted: true, policyVersion: true, createdAt: true },
    });
  },

  record(userId: string, consentType: ConsentType, granted: boolean, policyVersion: string) {
    return prisma.consentRecord.create({
      data: { userId, consentType, granted, policyVersion },
      select: { consentType: true, granted: true, policyVersion: true, createdAt: true },
    });
  },
};
