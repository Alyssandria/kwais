import type { Nutrient } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { TargetModel, type TargetRecord } from '../models/target.model.js';
import { NUTRIENT_LIMITS, type TargetBody } from '../schemas/patient.schemas.js';
import { AuditService, type RequestMeta } from './audit.service.js';

export interface TargetView {
  nutrient: Nutrient;
  dailyMax: number;
  unit: string;
  source: 'patient_entered' | 'clinician_verified';
  note: string | null;
  since: string;
}

function toView(t: TargetRecord): TargetView {
  return {
    nutrient: t.nutrient,
    dailyMax: Number(t.dailyMax),
    unit: t.unit,
    source: t.source,
    note: t.note,
    since: t.effectiveFrom.toISOString(),
  };
}

export const TargetService = {
  async listActive(patientId: string): Promise<TargetView[]> {
    const rows = await TargetModel.listActive(patientId);
    const seen = new Set<Nutrient>();
    return rows.filter((r) => r.dailyMax != null && !seen.has(r.nutrient) && seen.add(r.nutrient)).map(toView);
  },

  async set(patientId: string, nutrient: Nutrient, body: TargetBody, actorId: string, meta: RequestMeta): Promise<TargetView> {
    const limit = NUTRIENT_LIMITS[nutrient];
    if (body.dailyMax > limit.max) {
      throw HttpError.badRequest(`That is higher than any daily target K-WAIS accepts (${limit.max} ${limit.unit}). Check the number with your care team.`);
    }
    const t = await TargetModel.replace(patientId, {
      nutrient,
      dailyMax: body.dailyMax,
      unit: limit.unit,
      source: 'patient_entered',
      note: body.note ?? null,
    });
    await AuditService.record('update', 'nutrition_target', meta, { actorId, actorRole: 'patient', resourceId: t.id, patientId });
    return toView(t);
  },

  async remove(patientId: string, nutrient: Nutrient, actorId: string, meta: RequestMeta): Promise<void> {
    const ended = await TargetModel.end(patientId, nutrient);
    if (ended === 0) throw HttpError.notFound('There is no target for that nutrient');
    await AuditService.record('delete', 'nutrition_target', meta, { actorId, actorRole: 'patient', patientId });
  },
};
