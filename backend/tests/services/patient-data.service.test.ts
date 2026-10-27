import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../../src/models/lab.model.js', () => ({
  LabModel: { list: vi.fn(), findOwned: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../src/models/target.model.js', () => ({
  TargetModel: { listActive: vi.fn(), replace: vi.fn(), end: vi.fn() },
}));
vi.mock('../../src/models/patient-profile.model.js', () => ({
  PatientProfileModel: { findIdByUserId: vi.fn(), findById: vi.fn(), update: vi.fn() },
}));
vi.mock('../../src/models/audit.model.js', () => ({ AuditModel: { create: vi.fn() } }));

const { LabService } = await import('../../src/services/lab.service.js');
const { TargetService } = await import('../../src/services/target.service.js');
const { ProfileService } = await import('../../src/services/profile.service.js');
const { LabModel } = await import('../../src/models/lab.model.js');
const { TargetModel } = await import('../../src/models/target.model.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { AuditModel } = await import('../../src/models/audit.model.js');

const meta = { ipHash: 'h', userAgent: 'vitest' };
beforeEach(() => vi.clearAllMocks());

function echoRows() {
  vi.mocked(LabModel.create).mockImplementation(async (_pid, data) => ({
    id: 'lab-1',
    ...data,
    verifiedBy: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  }));
  vi.mocked(LabModel.update).mockImplementation(async (id, data) => ({
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
    verifiedBy: null,
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
    verifiedAt: null,
    verifiedBy: null,
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
    ckdStageVerifiedAt: new Date('2026-10-01T00:00:00Z') as Date | null,
    ckdStageVerifiedBy: { firstName: 'Ana', lastName: 'Reyes' } as { firstName: string; lastName: string } | null,
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

describe('clinician verification', () => {
  const clinician = { userId: 'u-doc', doctorId: 'd-1', name: 'Dr. Ana Reyes' };

  it('marks targets a doctor sets as verified by them', async () => {
    vi.mocked(TargetModel.replace).mockResolvedValue({
      id: 't1',
      nutrient: 'sodium',
      dailyMax: new Prisma.Decimal(1500),
      dailyMin: null,
      unit: 'mg',
      source: 'clinician_verified',
      note: null,
      effectiveFrom: new Date('2026-10-27T00:00:00Z'),
      effectiveTo: null,
      verifiedAt: new Date('2026-10-27T00:00:00Z'),
      verifiedBy: { firstName: 'Ana', lastName: 'Reyes' },
    });
    const t = await TargetService.set('patient-1', 'sodium', { dailyMax: 1500 }, 'u-doc', meta, clinician);
    expect(TargetModel.replace).toHaveBeenCalledWith('patient-1', expect.objectContaining({ source: 'clinician_verified', verifiedById: 'd-1' }));
    expect(t.verified).toEqual({ by: 'Dr. Ana Reyes', at: '2026-10-27T00:00:00.000Z' });
    expect(AuditModel.create).toHaveBeenCalledWith(expect.objectContaining({ actorRole: 'doctor', resourceType: 'nutrition_target' }));
  });

  it('clears verification when the patient edits a lab, and restores it when a doctor verifies', async () => {
    echoRows();
    const created = await LabService.create('patient-1', { test: 'potassium', value: 5.6, unit: 'mmol/L', collectedOn: '2026-10-03' }, 'u-doc', meta, clinician);
    expect(LabModel.create).toHaveBeenCalledWith('patient-1', expect.objectContaining({ source: 'clinician_verified', verifiedById: 'd-1' }));
    const stored = vi.mocked(LabModel.create).mock.calls[0]![1];
    vi.mocked(LabModel.findOwned).mockResolvedValue({ id: created.id, ...stored, verifiedBy: { firstName: 'Ana', lastName: 'Reyes' }, createdAt: new Date(), updatedAt: new Date() });

    await LabService.update('patient-1', created.id, { value: 5.2 }, 'u-patient', meta);
    expect(vi.mocked(LabModel.update).mock.calls[0]![1]).toMatchObject({ source: 'patient_entered', verifiedById: null, verifiedAt: null });

    vi.mocked(LabModel.update).mockImplementationOnce(async (id, data) => ({
      ...stored,
      ...(data as Required<typeof data>),
      id,
      verifiedBy: { firstName: 'Ana', lastName: 'Reyes' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const verified = await LabService.verify('patient-1', created.id, clinician, meta);
    expect(verified).toMatchObject({ value: 5.6, source: 'clinician_verified', verified: { by: 'Dr. Ana Reyes' } });
    const verify = vi.mocked(LabModel.update).mock.calls[1]![1];
    expect(verify).toMatchObject({ source: 'clinician_verified', verifiedById: 'd-1' });
    expect(verify).not.toHaveProperty('valueEnc');
  });

  it('sets the CKD stage as verified, and clears it when the patient changes the stage', async () => {
    const verified = {
      id: 'patient-1',
      patientCode: 'KW-000123',
      firstName: 'Maria',
      lastName: 'Santos',
      birthYear: null,
      sex: null,
      dietaryPreferences: [],
      allergies: [],
      restrictions: [],
      ckdStage: '4',
      ckdStageSource: 'clinician_verified' as const,
      ckdStageVerifiedAt: new Date('2026-10-27T00:00:00Z'),
      ckdStageVerifiedBy: { firstName: 'Ana', lastName: 'Reyes' },
      dialysisStatus: 'none' as const,
      onboardingStep: 0,
      onboardingDoneAt: null,
      reminderTime: null,
      timezone: 'Asia/Manila',
      updatedAt: new Date(),
    };
    vi.mocked(PatientProfileModel.update).mockResolvedValue(verified);
    const view = await ProfileService.setStage('patient-1', '4', clinician, meta);
    expect(PatientProfileModel.update).toHaveBeenCalledWith('patient-1', expect.objectContaining({ ckdStageSource: 'clinician_verified', ckdStageVerifiedById: 'd-1' }));
    expect(view.ckdStage).toMatchObject({ value: '4', verified: { by: 'Dr. Ana Reyes' } });

    vi.mocked(PatientProfileModel.findById).mockResolvedValue(verified);
    await ProfileService.update('patient-1', { ckdStage: '5' }, 'u-patient', meta);
    expect(vi.mocked(PatientProfileModel.update).mock.calls[1]![1]).toMatchObject({ ckdStageSource: 'patient_entered', ckdStageVerifiedById: null, ckdStageVerifiedAt: null });
  });
});
