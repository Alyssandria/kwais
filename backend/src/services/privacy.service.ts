import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { describeAgent } from '../lib/user-agent.js';
import { PatientProfileModel } from '../models/patient-profile.model.js';
import { PrivacyModel } from '../models/privacy.model.js';
import { AuditService, type RequestMeta } from './audit.service.js';
import { verifyCurrentPassword } from './auth.service.js';
import { LabService } from './lab.service.js';

export const EXPORT_FORMAT_VERSION = 1;

export interface ActivityEntry {
  id: string;
  action: string;
  resourceType: string;
  at: string;
  byYou: boolean;
  actorRole: 'patient' | 'doctor' | null;
  device: string | null;
}

export function toPlain(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, function (this: Record<string, unknown>, key: string, v: unknown) {
      const raw = this[key];
      return raw instanceof Prisma.Decimal ? raw.toNumber() : v;
    }),
  );
}

export function exportFilename(patientCode: string | null, now: Date): string {
  const code = (patientCode ?? 'account').replace(/[^A-Za-z0-9-]/g, '');
  return `kwais-export-${code}-${now.toISOString().slice(0, 10)}.json`;
}

export const PrivacyService = {
  async exportData(userId: string, meta: RequestMeta, now = new Date()) {
    const request = await PrivacyModel.recordRequest(userId, 'export');
    const account = await PrivacyModel.accountForExport(userId);
    if (!account) throw HttpError.unauthorized();
    const { patientProfile, doctorProfile, consents, notifications, dataRequests, ...user } = account;
    const patientId = patientProfile?.id ?? null;
    const { targets = [], meals = [], careLinks = [], careInvites = [], ...profile } = patientProfile ?? {};
    const labs = patientId ? await LabService.list(patientId) : [];
    const activity = await PrivacyService.activity(userId, 1000);

    await AuditService.record('export', 'account_data', meta, {
      actorId: userId,
      actorRole: account.role,
      resourceId: request.id,
      ...(patientId ? { patientId } : {}),
    });

    const body = toPlain({
      format: 'kwais-export',
      version: EXPORT_FORMAT_VERSION,
      exportedAt: now.toISOString(),
      about: [
        'Everything K-WAIS stores about your account, as of exportedAt.',
        'Lab values are decrypted. Meals include ones you deleted that have not been purged yet (deletedAt is set).',
        'Each meal analysis keeps inputsSnapshot: exactly what was sent to the AI, if anything.',
      ],
      account: user,
      profile: patientProfile ? profile : (doctorProfile ?? null),
      targets,
      careTeam: { links: careLinks, invites: careInvites },
      labs,
      meals,
      consents,
      notifications,
      dataRequests,
      activity,
    });
    return { filename: exportFilename(patientProfile?.patientCode ?? null, now), body };
  },

  async activity(userId: string, limit = 50): Promise<ActivityEntry[]> {
    const patientId = await PatientProfileModel.findIdByUserId(userId);
    const rows = await PrivacyModel.activity(userId, patientId, limit);
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      resourceType: r.resourceType,
      at: r.at.toISOString(),
      byYou: r.actorId === userId,
      actorRole: r.actorRole,
      device: describeAgent(r.userAgent),
    }));
  },

  async deleteAccount(userId: string, password: string, meta: RequestMeta): Promise<void> {
    await verifyCurrentPassword(userId, password);
    const patientId = await PatientProfileModel.findIdByUserId(userId);
    await PrivacyModel.deleteUser(userId);
    await AuditService.record('delete', 'account', meta, {
      actorId: userId,
      actorRole: patientId ? 'patient' : 'doctor',
      resourceId: userId,
      ...(patientId ? { patientId } : {}),
    });
  },
};
