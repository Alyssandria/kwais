import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../models/lab.model.js', () => ({
  LabModel: { list: vi.fn(), findOwned: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('../models/target.model.js', () => ({
  TargetModel: { listActive: vi.fn(), replace: vi.fn(), end: vi.fn() },
}));
vi.mock('../models/patient-profile.model.js', () => ({
  PatientProfileModel: { findIdByUserId: vi.fn(), findById: vi.fn(), update: vi.fn() },
}));
vi.mock('../models/audit.model.js', () => ({ AuditModel: { create: vi.fn() } }));

const { LabService } = await import('./lab.service.js');
const { TargetService } = await import('./target.service.js');
const { ProfileService } = await import('./profile.service.js');
const { LabModel } = await import('../models/lab.model.js');
const { TargetModel } = await import('../models/target.model.js');
const { PatientProfileModel } = await import('../models/patient-profile.model.js');
const { AuditModel } = await import('../models/audit.model.js');

const meta = { ipHash: 'h', userAgent: 'vitest' };
beforeEach(() => vi.clearAllMocks());

/** Makes LabModel.create/update echo what they were given, like the database would. */
function echoRows() {
  vi.mocked(LabModel.create).mockImplementation(async (_pid, data) => ({
    id: 'lab-1',
    ...data,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  }));
  vi.mocked(LabModel.update).mockImplementation(async (id, data) => ({
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...(data as Required<typeof data>),
  }));
}

describe('LabService', () => {
  const body = {
    test: 'potassium' as const,
    value: 5.6,
    refLow: 3.5,
    refHigh: 5.1,
    unit: 'mmol/L',
    collectedOn: '2026-09-28',
  };

  it('stores only ciphertext and returns the decrypted values', async () => {
    echoRows();
    const view = await LabService.create('patient-1', body, 'user-1', meta);

    const stored = vi.mocked(LabModel.create).mock.calls[0]![1];
    expect(Buffer.from(stored.valueEnc).toString('latin1')).not.toContain('5.6');
    expect(stored.source).toBe('patient_entered');
    expect(view).toMatchObject({ value: 5.6, refLow: 3.5, refHigh: 5.1, label: 'Potassium', collectedOn: '2026-09-28' });
    expect(AuditModel.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', resourceType: 'lab_result', patientId: 'patient-1' }));
  });

  it('cannot read a row encrypted for another patient', async () => {
    echoRows();
    await LabService.create('patient-1', body, 'user-1', meta);
    const row = await vi.mocked(LabModel.create).mock.results[0]!.value;
    vi.mocked(LabModel.list).mockResolvedValue([row]);
    await expect(LabService.list('patient-2')).rejects.toThrow(/integrity/);
  });

  it('keeps unchanged fields and marks edits as patient-entered', async () => {
    echoRows();
    await LabService.create('patient-1', body, 'user-1', meta);
    const row = await vi.mocked(LabModel.create).mock.results[0]!.value;
    vi.mocked(LabModel.findOwned).mockResolvedValue({ ...row, source: 'clinician_verified' });

    const view = await LabService.update('patient-1', 'lab-1', { value: 5.2 }, 'user-1', meta);
    expect(view).toMatchObject({ value: 5.2, refLow: 3.5, refHigh: 5.1, unit: 'mmol/L', source: 'patient_entered' });
  });

  it('refuses a range that ends below where it starts after an edit', async () => {
    echoRows();
    await LabService.create('patient-1', body, 'user-1', meta);
    vi.mocked(LabModel.findOwned).mockResolvedValue(await vi.mocked(LabModel.create).mock.results[0]!.value);
    await expect(LabService.update('patient-1', 'lab-1', { refHigh: 2 }, 'user-1', meta)).rejects.toMatchObject({ status: 400 });
  });

  it('treats another patient’s lab id as not found', async () => {
    vi.mocked(LabModel.findOwned).mockResolvedValue(null);
    await expect(LabService.remove('patient-1', 'someone-elses', 'user-1', meta)).rejects.toMatchObject({ status: 404 });
    expect(LabModel.delete).not.toHaveBeenCalled();
  });
});

describe('TargetService', () => {
  const row = (nutrient: 'sodium' | 'protein', max: number, from: string) => ({
    id: `${nutrient}-${from}`,
    nutrient,
    dailyMax: new Prisma.Decimal(max),
    dailyMin: null,
    unit: nutrient === 'protein' ? 'g' : 'mg',
    source: 'patient_entered' as const,
    note: null,
    effectiveFrom: new Date(from),
    effectiveTo: null,
  });

  it('fixes the unit per nutrient and records the patient as the source', async () => {
    vi.mocked(TargetModel.replace).mockResolvedValue(row('protein', 50, '2026-10-01'));
    await TargetService.set('patient-1', 'protein', { dailyMax: 50 }, 'user-1', meta);
    expect(TargetModel.replace).toHaveBeenCalledWith('patient-1', expect.objectContaining({ unit: 'g', source: 'patient_entered' }));
  });

  it('rejects impossible amounts', async () => {
    await expect(TargetService.set('patient-1', 'sodium', { dailyMax: 50_000 }, 'user-1', meta)).rejects.toMatchObject({ status: 400 });
    expect(TargetModel.replace).not.toHaveBeenCalled();
  });

  it('returns one current target per nutrient', async () => {
    vi.mocked(TargetModel.listActive).mockResolvedValue([row('sodium', 1800, '2026-10-10'), row('sodium', 2000, '2026-09-01')]);
    const list = await TargetService.listActive('patient-1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ nutrient: 'sodium', dailyMax: 1800 });
  });
});

describe('ProfileService', () => {
  const profile = {
    id: 'patient-1',
    patientCode: 'KW-000123',
    firstName: 'Maria',
    lastName: 'Santos',
    birthYear: null,
    sex: null,
    dietaryPreferences: [],
    allergies: [],
    restrictions: [],
    ckdStage: '3b',
    ckdStageSource: 'clinician_verified' as const,
    dialysisStatus: 'none' as const,
    onboardingStep: 0,
    onboardingDoneAt: null,
    reminderTime: null,
    timezone: 'Asia/Manila',
    updatedAt: new Date(),
  };

  it('records a CKD stage the patient changes as patient-entered', async () => {
    vi.mocked(PatientProfileModel.findById).mockResolvedValue(profile);
    vi.mocked(PatientProfileModel.update).mockResolvedValue({ ...profile, ckdStage: '4', ckdStageSource: 'patient_entered' });
    await ProfileService.update('patient-1', { ckdStage: '4' }, 'user-1', meta);
    expect(PatientProfileModel.update).toHaveBeenCalledWith('patient-1', expect.objectContaining({ ckdStage: '4', ckdStageSource: 'patient_entered' }));
  });

  it('leaves a verified stage alone when other fields change', async () => {
    vi.mocked(PatientProfileModel.findById).mockResolvedValue(profile);
    vi.mocked(PatientProfileModel.update).mockResolvedValue(profile);
    await ProfileService.update('patient-1', { allergies: ['shrimp'] }, 'user-1', meta);
    const data = vi.mocked(PatientProfileModel.update).mock.calls[0]![1];
    expect(data).not.toHaveProperty('ckdStageSource');
  });
});
