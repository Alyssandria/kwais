import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/models/patient-profile.model.js', () => ({
  PatientProfileModel: { findIdByUserId: vi.fn(), findById: vi.fn(), update: vi.fn() },
}));
vi.mock('../../src/services/lab.service.js', () => ({
  LabService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));
vi.mock('../../src/services/target.service.js', () => ({
  TargetService: { listActive: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { LabService } = await import('../../src/services/lab.service.js');
const { TargetService } = await import('../../src/services/target.service.js');

const app = createApp();
const token = (role: 'patient' | 'doctor', sub = 'user-1') =>
  `Bearer ${signAccessToken({ sub, role }, process.env.JWT_ACCESS_SECRET!, 900)}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PatientProfileModel.findIdByUserId).mockResolvedValue('patient-1');
});

describe('patient-owned routes', () => {
  it('require sign-in', async () => {
    expect((await request(app).get('/api/v1/labs')).status).toBe(401);
    expect((await request(app).get('/api/v1/patients/me/profile')).status).toBe(401);
  });

  it('are closed to doctors', async () => {
    const res = await request(app).get('/api/v1/labs').set('Authorization', token('doctor'));
    expect(res.status).toBe(403);
  });

  it('always use the signed-in patient’s own id', async () => {
    vi.mocked(LabService.list).mockResolvedValue([]);
    await request(app).get('/api/v1/labs?patientId=someone-else').set('Authorization', token('patient'));
    expect(PatientProfileModel.findIdByUserId).toHaveBeenCalledWith('user-1');
    expect(LabService.list).toHaveBeenCalledWith('patient-1', undefined);
  });
});

describe('POST /labs', () => {
  it('validates the lab slip fields', async () => {
    const res = await request(app)
      .post('/api/v1/labs')
      .set('Authorization', token('patient'))
      .send({ test: 'potassium', value: -1, refLow: 5.1, refHigh: 3.5, unit: '', collectedOn: '2999-01-01' });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['value', 'unit', 'collectedOn']));
    expect(LabService.create).not.toHaveBeenCalled();
  });

  it('requires a name for an "other" test', async () => {
    const res = await request(app)
      .post('/api/v1/labs')
      .set('Authorization', token('patient'))
      .send({ test: 'other', value: 1, unit: 'mg/dL', collectedOn: '2026-09-28' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('testLabel');
  });

  it('creates a valid result', async () => {
    vi.mocked(LabService.create).mockResolvedValue({ id: 'lab-1' } as never);
    const res = await request(app)
      .post('/api/v1/labs')
      .set('Authorization', token('patient'))
      .send({ test: 'potassium', value: 5.6, refLow: 3.5, refHigh: 5.1, unit: 'mmol/L', collectedOn: '2026-09-28' });
    expect(res.status).toBe(201);
    expect(LabService.create).toHaveBeenCalledWith('patient-1', expect.objectContaining({ value: 5.6 }), 'user-1', expect.any(Object));
  });
});

describe('targets', () => {
  it('rejects an unknown nutrient', async () => {
    const res = await request(app).put('/api/v1/patients/me/targets/sugar').set('Authorization', token('patient')).send({ dailyMax: 10 });
    expect(res.status).toBe(404);
    expect(TargetService.set).not.toHaveBeenCalled();
  });

  it('sets a daily maximum', async () => {
    vi.mocked(TargetService.set).mockResolvedValue({ nutrient: 'sodium', dailyMax: 2000 } as never);
    const res = await request(app).put('/api/v1/patients/me/targets/sodium').set('Authorization', token('patient')).send({ dailyMax: 2000 });
    expect(res.status).toBe(200);
    expect(TargetService.set).toHaveBeenCalledWith('patient-1', 'sodium', { dailyMax: 2000 }, 'user-1', expect.any(Object));
  });
});

describe('PATCH /patients/me/profile', () => {
  it('refuses fields patients may not set', async () => {
    const res = await request(app)
      .patch('/api/v1/patients/me/profile')
      .set('Authorization', token('patient'))
      .send({ ckdStageSource: 'clinician_verified' });
    expect(res.status).toBe(400);
    expect(PatientProfileModel.update).not.toHaveBeenCalled();
  });
});
