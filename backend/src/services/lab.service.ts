import type { LabTest } from '@prisma/client';
import { currentLabKey, labKeys } from '../config/crypto.js';
import { decryptField, encryptField } from '../lib/field-crypto.js';
import { HttpError } from '../lib/http-error.js';
import { LabModel, type EncryptedLab, type EncryptedLabInput } from '../models/lab.model.js';
import { LAB_TESTS, type LabCreate, type LabUpdate } from '../schemas/patient.schemas.js';
import { AuditService, type RequestMeta } from './audit.service.js';

export interface LabView {
  id: string;
  test: LabTest;
  label: string;
  value: number;
  refLow: number | null;
  refHigh: number | null;
  unit: string;
  collectedOn: string;
  labName: string | null;
  source: 'patient_entered' | 'clinician_verified';
  createdAt: string;
}

const ctx = (patientId: string, field: 'value' | 'ref_low' | 'ref_high') => `lab:${patientId}:${field}`;

const enc = (patientId: string, field: 'value' | 'ref_low' | 'ref_high', n: number) =>
  new Uint8Array(encryptField(String(n), ctx(patientId, field), currentLabKey));

const encOpt = (patientId: string, field: 'ref_low' | 'ref_high', n: number | null | undefined) =>
  n == null ? null : enc(patientId, field, n);

const dec = (patientId: string, field: 'value' | 'ref_low' | 'ref_high', blob: Uint8Array) =>
  Number(decryptField(blob, ctx(patientId, field), labKeys));

function toView(patientId: string, row: EncryptedLab): LabView {
  return {
    id: row.id,
    test: row.test,
    label: row.test === 'other' ? (row.testLabel ?? 'Other') : LAB_TESTS[row.test],
    value: dec(patientId, 'value', row.valueEnc),
    refLow: row.refLowEnc ? dec(patientId, 'ref_low', row.refLowEnc) : null,
    refHigh: row.refHighEnc ? dec(patientId, 'ref_high', row.refHighEnc) : null,
    unit: row.unit,
    collectedOn: row.collectedOn.toISOString().slice(0, 10),
    labName: row.labName,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

const dateOnly = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const LabService = {
  async list(patientId: string, test?: LabTest): Promise<LabView[]> {
    return (await LabModel.list(patientId, test)).map((r) => toView(patientId, r));
  },

  async create(patientId: string, body: LabCreate, actorId: string, meta: RequestMeta): Promise<LabView> {
    const row = await LabModel.create(patientId, {
      test: body.test,
      testLabel: body.test === 'other' ? (body.testLabel ?? null) : null,
      valueEnc: enc(patientId, 'value', body.value),
      refLowEnc: encOpt(patientId, 'ref_low', body.refLow),
      refHighEnc: encOpt(patientId, 'ref_high', body.refHigh),
      unit: body.unit,
      collectedOn: dateOnly(body.collectedOn),
      labName: body.labName ?? null,
      source: 'patient_entered',
      keyVersion: currentLabKey.version,
    });
    await AuditService.record('create', 'lab_result', meta, { actorId, actorRole: 'patient', resourceId: row.id, patientId });
    return toView(patientId, row);
  },

  async update(patientId: string, id: string, body: LabUpdate, actorId: string, meta: RequestMeta): Promise<LabView> {
    const existing = await LabModel.findOwned(patientId, id);
    if (!existing) throw HttpError.notFound('Lab result not found');
    const current = toView(patientId, existing);

    const merged = {
      value: body.value ?? current.value,
      refLow: body.refLow !== undefined ? body.refLow : current.refLow,
      refHigh: body.refHigh !== undefined ? body.refHigh : current.refHigh,
    };
    if (merged.refLow != null && merged.refHigh != null && merged.refLow > merged.refHigh) {
      throw HttpError.badRequest('The high end of the range must be above the low end');
    }
    const test = body.test ?? current.test;
    const data: Partial<EncryptedLabInput> = {
      test,
      testLabel: test === 'other' ? (body.testLabel ?? existing.testLabel) : null,
      valueEnc: enc(patientId, 'value', merged.value),
      refLowEnc: encOpt(patientId, 'ref_low', merged.refLow),
      refHighEnc: encOpt(patientId, 'ref_high', merged.refHigh),
      unit: body.unit ?? current.unit,
      collectedOn: body.collectedOn ? dateOnly(body.collectedOn) : existing.collectedOn,
      labName: body.labName !== undefined ? body.labName : current.labName,
      source: 'patient_entered',
      keyVersion: currentLabKey.version,
    };
    const row = await LabModel.update(id, data);
    await AuditService.record('update', 'lab_result', meta, { actorId, actorRole: 'patient', resourceId: id, patientId });
    return toView(patientId, row);
  },

  async remove(patientId: string, id: string, actorId: string, meta: RequestMeta): Promise<void> {
    const existing = await LabModel.findOwned(patientId, id);
    if (!existing) throw HttpError.notFound('Lab result not found');
    await LabModel.delete(id);
    await AuditService.record('delete', 'lab_result', meta, { actorId, actorRole: 'patient', resourceId: id, patientId });
  },
};
