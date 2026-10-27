import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/services/care.service.js', async (original) => ({
  ...(await original<typeof import('../../src/services/care.service.js')>()),
  CareService: { assertActiveLink: vi.fn() },
}));
vi.mock('../../src/services/meal.service.js', () => ({ MealService: { list: vi.fn(), get: vi.fn() } }));
vi.mock('../../src/services/dashboard.service.js', () => ({ DashboardService: { forPatient: vi.fn() } }));
vi.mock('../../src/models/audit.model.js', () => ({ AuditModel: { create: vi.fn() } }));
vi.mock('../../src/services/doctor-patients.service.js', () => ({ DoctorPatientsService: { one: vi.fn(), list: vi.fn() } }));
vi.mock('../../src/services/clinical.service.js', () => ({
  ClinicalService: { setStage: vi.fn(), setTarget: vi.fn(), addLab: vi.fn(), correctLab: vi.fn(), verifyLab: vi.fn(), notes: vi.fn(), addNote: vi.fn(), editNote: vi.fn(), removeNote: vi.fn() },
}));

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');
const { HttpError } = await import('../../src/lib/http-error.js');
const { CareService } = await import('../../src/services/care.service.js');
const { MealService } = await import('../../src/services/meal.service.js');
const { DashboardService } = await import('../../src/services/dashboard.service.js');
const { AuditModel } = await import('../../src/models/audit.model.js');
const { DoctorPatientsService } = await import('../../src/services/doctor-patients.service.js');
const { ClinicalService } = await import('../../src/services/clinical.service.js');

const app = createApp();
const PATIENT = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b';
const MEAL = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const token = (role: 'patient' | 'doctor') => `Bearer ${signAccessToken({ sub: 'd1', role }, process.env.JWT_ACCESS_SECRET!, 900)}`;
const get = (path: string, role: 'patient' | 'doctor' = 'doctor') => request(app).get(`/api/v1/doctors/me/patients/${path}`).set('Authorization', token(role));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(CareService.assertActiveLink).mockResolvedValue(undefined);
});

describe('doctor routes to one patient', () => {
  it('are closed to patients', async () => {
    expect((await get(`${PATIENT}/meals`, 'patient')).status).toBe(403);
    expect(CareService.assertActiveLink).not.toHaveBeenCalled();
  });

  it('answer not found without an active link, and touch no data', async () => {
    vi.mocked(CareService.assertActiveLink).mockRejectedValue(HttpError.notFound('Patient not found'));
    const res = await get(`${PATIENT}/meals/${MEAL}`);
    expect(res.status).toBe(404);
    expect(CareService.assertActiveLink).toHaveBeenCalledWith('d1', PATIENT);
    expect(MealService.get).not.toHaveBeenCalled();
    expect(AuditModel.create).not.toHaveBeenCalled();
  });

  it('answer not found for a malformed id without checking anything', async () => {
    expect((await get('not-a-uuid/meals')).status).toBe(404);
    expect(CareService.assertActiveLink).not.toHaveBeenCalled();
  });

  it('read a meal for the linked patient and record the view in their audit trail', async () => {
    vi.mocked(MealService.get).mockResolvedValue({ id: MEAL } as never);
    const res = await get(`${PATIENT}/meals/${MEAL}`);
    expect(res.status).toBe(200);
    expect(MealService.get).toHaveBeenCalledWith(PATIENT, MEAL);
    expect(AuditModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'read', resourceType: 'meal', resourceId: MEAL, patientId: PATIENT, actorId: 'd1', actorRole: 'doctor' }),
    );
  });

  it('do not audit the supporting dashboard call made by the overview page', async () => {
    vi.mocked(DashboardService.forPatient).mockResolvedValue({} as never);
    expect((await get(`${PATIENT}/dashboard`)).status).toBe(200);
    expect(DashboardService.forPatient).toHaveBeenCalledWith(PATIENT);
    expect(AuditModel.create).not.toHaveBeenCalled();
  });

  it('keep the patient’s drafts private', async () => {
    vi.mocked(MealService.get).mockResolvedValue({ id: MEAL, status: 'draft' } as never);
    expect((await get(`${PATIENT}/meals/${MEAL}`)).status).toBe(404);
    const list = await get(`${PATIENT}/meals?status=draft`);
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);
    expect(MealService.list).not.toHaveBeenCalled();
  });

  it('return the patient record and log the view', async () => {
    vi.mocked(DoctorPatientsService.one).mockResolvedValue({ linkId: 'l1' } as never);
    const res = await get(PATIENT);
    expect(res.status).toBe(200);
    expect(DoctorPatientsService.one).toHaveBeenCalledWith('d1', PATIENT);
    expect(AuditModel.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'read', resourceType: 'patient_record', patientId: PATIENT }));
  });
});

describe('clinical actions on one patient', () => {
  const send = (method: 'put' | 'post' | 'patch' | 'delete', path: string, body?: object) =>
    request(app)[method](`/api/v1/doctors/me/patients/${PATIENT}/${path}`).set('Authorization', token('doctor')).send(body);

  it('need an active link before anything is validated or changed', async () => {
    vi.mocked(CareService.assertActiveLink).mockRejectedValue(HttpError.notFound('Patient not found'));
    expect((await send('post', 'notes', { body: 'Hello' })).status).toBe(404);
    expect((await send('put', 'ckd-stage', { ckdStage: 'nope' })).status).toBe(404);
    expect(ClinicalService.addNote).not.toHaveBeenCalled();
  });

  it('accept a definite CKD stage only', async () => {
    expect((await send('put', 'ckd-stage', { ckdStage: 'not_sure' })).status).toBe(400);
    expect(ClinicalService.setStage).not.toHaveBeenCalled();
    vi.mocked(ClinicalService.setStage).mockResolvedValue({} as never);
    expect((await send('put', 'ckd-stage', { ckdStage: '3b' })).status).toBe(200);
    expect(ClinicalService.setStage).toHaveBeenCalledWith('d1', PATIENT, '3b', expect.anything());
  });

  it('add a note, trimmed', async () => {
    vi.mocked(ClinicalService.addNote).mockResolvedValue({ id: 'n1' } as never);
    const res = await send('post', 'notes', { body: '  Keep sodium low this week.  ' });
    expect(res.status).toBe(201);
    expect(ClinicalService.addNote).toHaveBeenCalledWith('d1', PATIENT, 'Keep sodium low this week.', expect.anything());
    expect((await send('post', 'notes', { body: '   ' })).status).toBe(400);
  });

  it('answer not found for malformed lab and note ids', async () => {
    expect((await send('post', 'labs/not-an-id/verify')).status).toBe(404);
    expect((await send('delete', 'notes/not-an-id')).status).toBe(404);
    expect(ClinicalService.verifyLab).not.toHaveBeenCalled();
    expect(ClinicalService.removeNote).not.toHaveBeenCalled();
  });

  it('reject unknown nutrients', async () => {
    expect((await send('put', 'targets/salt', { dailyMax: 2000 })).status).toBe(404);
    expect(ClinicalService.setTarget).not.toHaveBeenCalled();
  });
});

