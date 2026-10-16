import type { ConsentType } from '@prisma/client';
import { ConsentModel } from '../models/consent.model.js';
import type { ConsentChange } from '../schemas/patient.schemas.js';
import { AuditService, type RequestMeta } from './audit.service.js';
import { POLICY_VERSION } from './auth.service.js';

export type ConsentState = Record<ConsentType, { granted: boolean; policyVersion: string; at: string } | null>;

export const ConsentService = {
  async current(userId: string): Promise<ConsentState> {
    const state: ConsentState = { terms: null, health_data: null, ai_processing: null, reminders: null };
    for (const r of await ConsentModel.listForUser(userId)) {
      state[r.consentType] ??= { granted: r.granted, policyVersion: r.policyVersion, at: r.createdAt.toISOString() };
    }
    return state;
  },

  async change(userId: string, body: ConsentChange, meta: RequestMeta): Promise<ConsentState> {
    await ConsentModel.record(userId, body.consentType, body.granted, POLICY_VERSION);
    await AuditService.record('update', `consent:${body.consentType}`, meta, { actorId: userId, actorRole: 'patient' });
    return ConsentService.current(userId);
  },

  async hasAiConsent(userId: string): Promise<boolean> {
    return (await ConsentService.current(userId)).ai_processing?.granted === true;
  },
};
