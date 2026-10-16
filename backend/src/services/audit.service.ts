import type { Request } from 'express';
import type { AuditAction } from '@prisma/client';
import { AuditModel } from '../models/audit.model.js';
import { hashIp } from '../lib/tokens.js';
import { env } from '../config/env.js';

export interface RequestMeta {
  ipHash?: string;
  userAgent?: string;
}

export function requestMeta(req: Request): RequestMeta {
  return {
    ipHash: hashIp(req.ip, env.JWT_REFRESH_SECRET),
    userAgent: req.get('user-agent')?.slice(0, 255),
  };
}

export const AuditService = {
  async record(
    action: AuditAction,
    resourceType: string,
    meta: RequestMeta,
    opts: { actorId?: string; actorRole?: 'patient' | 'doctor'; resourceId?: string; patientId?: string } = {},
  ): Promise<void> {
    try {
      await AuditModel.create({ action, resourceType, ...meta, ...opts });
    } catch (err) {
      console.error('Audit log write failed', err);
    }
  },
};
