import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/models/care.model.js', () => ({ CareModel: { doctorByUserId: vi.fn() } }));
vi.mock('../../src/models/patient-profile.model.js', () => ({ PatientProfileModel: { userIdById: vi.fn() } }));
vi.mock('../../src/services/notification.service.js', () => ({ NotificationService: { notify: vi.fn() } }));
vi.mock('../../src/services/profile.service.js', () => ({ ProfileService: { get: vi.fn(), setStage: vi.fn() } }));
vi.mock('../../src/services/target.service.js', () => ({ TargetService: { listActive: vi.fn(), set: vi.fn() } }));
vi.mock('../../src/services/lab.service.js', () => ({ LabService: { create: vi.fn(), update: vi.fn(), verify: vi.fn() } }));
vi.mock('../../src/services/note.service.js', () => ({ NoteService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }));

const { ClinicalService, preview } = await import('../../src/services/clinical.service.js');
const { CareModel } = await import('../../src/models/care.model.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { NotificationService } = await import('../../src/services/notification.service.js');
const { ProfileService } = await import('../../src/services/profile.service.js');
const { TargetService } = await import('../../src/services/target.service.js');
const { LabService } = await import('../../src/services/lab.service.js');
const { NoteService } = await import('../../src/services/note.service.js');

const meta = { ipHash: 'h', userAgent: 'vitest' };
const clinician = { userId: 'u-doc', doctorId: 'd-1', name: 'Dr. Ana Reyes' };
const target = (dailyMax: number, note: string | null = null) => ({
  nutrient: 'sodium' as const,
  dailyMax,
  unit: 'mg',
  source: 'clinician_verified' as const,
  note,
  since: '',
  verified: { by: 'Dr. Ana Reyes', at: '' },
});
const lab = { id: 'l1', test: 'potassium' as const, label: 'Potassium', value: 5.6, refLow: 3.5, refHigh: 5.1, unit: 'mmol/L', collectedOn: '2026-10-03', labName: null, source: 'clinician_verified' as const, verified: null, createdAt: '' };
const told = () => vi.mocked(NotificationService.notify).mock.calls[0]?.[1];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(CareModel.doctorByUserId).mockResolvedValue({ id: 'd-1', userId: 'u-doc', firstName: 'Ana', lastName: 'Reyes', prcLicense: null, specialty: null, clinic: null });
  vi.mocked(PatientProfileModel.userIdById).mockResolvedValue('u-patient');
});

describe('ClinicalService', () => {
  it('refuses accounts without a doctor profile', async () => {
    vi.mocked(CareModel.doctorByUserId).mockResolvedValue(null);
    await expect(ClinicalService.addNote('u-x', 'p1', 'Hello', meta)).rejects.toMatchObject({ status: 403 });
    expect(NoteService.create).not.toHaveBeenCalled();
  });

  it('says "confirmed" when the doctor keeps the patient’s stage, "set" when it changes', async () => {
    vi.mocked(ProfileService.get).mockResolvedValue({ ckdStage: { value: '4' } } as never);
    vi.mocked(ProfileService.setStage).mockResolvedValue({} as never);
    await ClinicalService.setStage('u-doc', 'p1', '4', meta);
    expect(ProfileService.setStage).toHaveBeenCalledWith('p1', '4', clinician, meta);
    expect(NotificationService.notify).toHaveBeenCalledWith('u-patient', expect.objectContaining({ type: 'care_team', title: 'Dr. Ana Reyes confirmed your CKD stage', link: '/patient/profile' }));

    vi.clearAllMocks();
    vi.mocked(CareModel.doctorByUserId).mockResolvedValue({ id: 'd-1', userId: 'u-doc', firstName: 'Ana', lastName: 'Reyes', prcLicense: null, specialty: null, clinic: null });
    vi.mocked(PatientProfileModel.userIdById).mockResolvedValue('u-patient');
    vi.mocked(ProfileService.get).mockResolvedValue({ ckdStage: null } as never);
    await ClinicalService.setStage('u-doc', 'p1', '3b', meta);
    expect(told()).toMatchObject({ title: 'Dr. Ana Reyes set your CKD stage', body: 'Stage 3b. Meal analyses use it from now on.' });
  });

  it('verifies a target kept at the same amount and tells the patient the new amount otherwise', async () => {
    vi.mocked(TargetService.listActive).mockResolvedValue([{ ...target(2000), source: 'patient_entered', verified: null }]);
    vi.mocked(TargetService.set).mockResolvedValue(target(2000));
    await ClinicalService.setTarget('u-doc', 'p1', 'sodium', { dailyMax: 2000 }, meta);
    expect(TargetService.set).toHaveBeenCalledWith('p1', 'sodium', { dailyMax: 2000 }, 'u-doc', meta, clinician);
    expect(told()).toMatchObject({ title: 'Dr. Ana Reyes verified your sodium target' });

    vi.mocked(NotificationService.notify).mockClear();
    vi.mocked(TargetService.set).mockResolvedValue(target(1500, 'Lower while potassium is high'));
    await ClinicalService.setTarget('u-doc', 'p1', 'sodium', { dailyMax: 1500, note: 'Lower while potassium is high' }, meta);
    expect(told()).toMatchObject({
      title: 'Dr. Ana Reyes set your sodium target',
      body: '1,500 mg a day. Note: Lower while potassium is high. New meal analyses use it.',
    });
  });

  it('adds, corrects and verifies labs as the clinician, linking the patient to their labs', async () => {
    vi.mocked(LabService.create).mockResolvedValue(lab);
    vi.mocked(LabService.update).mockResolvedValue(lab);
    vi.mocked(LabService.verify).mockResolvedValue(lab);
    const body = { test: 'potassium' as const, value: 5.6, unit: 'mmol/L', collectedOn: '2026-10-03' };
    await ClinicalService.addLab('u-doc', 'p1', body, meta);
    expect(LabService.create).toHaveBeenCalledWith('p1', body, 'u-doc', meta, clinician);
    expect(told()).toMatchObject({ title: 'Dr. Ana Reyes added a Potassium result', body: '5.6 mmol/L, collected Oct 3, 2026.', link: '/patient/labs' });

    await ClinicalService.correctLab('u-doc', 'p1', 'l1', { value: 5.6 }, meta);
    expect(LabService.update).toHaveBeenCalledWith('p1', 'l1', { value: 5.6 }, 'u-doc', meta, clinician);
    await ClinicalService.verifyLab('u-doc', 'p1', 'l1', meta);
    expect(LabService.verify).toHaveBeenCalledWith('p1', 'l1', clinician, meta);
    expect(vi.mocked(NotificationService.notify).mock.calls.map((c) => c[1].title)).toEqual([
      'Dr. Ana Reyes added a Potassium result',
      'Dr. Ana Reyes corrected your Potassium result',
      'Dr. Ana Reyes verified your Potassium result',
    ]);
  });

  it('notifies on a new note but not on edits', async () => {
    vi.mocked(NoteService.create).mockResolvedValue({} as never);
    vi.mocked(NoteService.update).mockResolvedValue({} as never);
    await ClinicalService.addNote('u-doc', 'p1', 'Keep sodium low this week.', meta);
    expect(told()).toMatchObject({ title: 'Dr. Ana Reyes left you a note', body: 'Keep sodium low this week.', link: '/patient/notes' });
    vi.mocked(NotificationService.notify).mockClear();
    await ClinicalService.editNote('u-doc', 'p1', 'n1', 'Keep sodium low this month.', meta);
    expect(NotificationService.notify).not.toHaveBeenCalled();
  });

  it('lists notes marking the doctor’s own', async () => {
    vi.mocked(NoteService.list).mockResolvedValue([]);
    await ClinicalService.notes('u-doc', 'p1');
    expect(NoteService.list).toHaveBeenCalledWith('p1', 'd-1');
  });
});

describe('preview', () => {
  it('flattens whitespace and shortens long notes', () => {
    expect(preview('Line one\n\n  line two')).toBe('Line one line two');
    expect(preview('a'.repeat(200), 10)).toBe(`${'a'.repeat(9)}…`);
  });
});
