import type { AuditAction, Role } from '@prisma/client';
import { prisma } from '../config/db.js';

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: Role | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  patientId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
}

export const AuditModel = {
  create(entry: AuditEntry) {
    return prisma.auditLog.create({ data: entry, select: { id: true } });
  },
};
