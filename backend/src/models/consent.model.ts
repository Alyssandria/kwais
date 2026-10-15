import type { ConsentType } from '@prisma/client';
import { prisma } from '../config/db.js';

export const ConsentModel = {
  /** Every consent record for a user, newest first. The newest per type is the current choice. */
  listForUser(userId: string) {
    return prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { consentType: true, granted: true, policyVersion: true, createdAt: true },
    });
  },

  /** Append-only: a change of mind is a new row, never an edit. */
  record(userId: string, consentType: ConsentType, granted: boolean, policyVersion: string) {
    return prisma.consentRecord.create({
      data: { userId, consentType, granted, policyVersion },
      select: { consentType: true, granted: true, policyVersion: true, createdAt: true },
    });
  },
};
