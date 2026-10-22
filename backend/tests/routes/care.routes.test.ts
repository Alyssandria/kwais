import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/models/patient-profile.model.js', () => ({ PatientProfileModel: { findIdByUserId: vi.fn() } }));
vi.mock('../../src/services/care.service.js', () => ({
  CareService: { forPatient: vi.fn(), forDoctor: vi.fn(), inviteByEmail: vi.fn(), requestByCode: vi.fn(), cancelInvite: vi.fn(), act: vi.fn(), previewInvite: vi.fn(), claimInvite: vi.fn() },
}));

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { CareService } = await import('../../src/services/care.service.js');

const app = createApp();
const as = (role: 'patient' | 'doctor', sub = role === 'patient' ? 'pu-1' : 'du-1') => `Bearer ${signAccessToken({ sub, role }, process.env.JWT_ACCESS_SECRET!, 900)}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PatientProfileModel.findIdByUserId).mockResolvedValue('pat-1');
});

describe('doctor care routes', () => {
  it('accepts a request by code with the same answer whatever the outcome', async () => {
    const res = await request(app).post('/api/v1/doctors/me/care/requests').set('Authorization', as('doctor')).send({ patientCode: 'kw-002318' });
    expect(res.status).toBe(202);
    expect(CareService.requestByCode).toHaveBeenCalledWith('du-1', 'KW-002318', undefined, expect.any(Object));
  });

  it('checks the code format', async () => {
    const res = await request(app).post('/api/v1/doctors/me/care/requests').set('Authorization', as('doctor')).send({ patientCode: '12345' });
    expect(res.status).toBe(400);
    expect(CareService.requestByCode).not.toHaveBeenCalled();
  });

  it('is closed to patients', async () => {
    expect((await request(app).get('/api/v1/doctors/me/care').set('Authorization', as('patient'))).status).toBe(403);
  });

  it('passes only known actions', async () => {
    vi.mocked(CareService.act).mockResolvedValue({ id: 'l1', status: 'active' });
    expect((await request(app).post('/api/v1/doctors/me/care/links/l1/approve').set('Authorization', as('doctor'))).status).toBe(200);
    expect(CareService.act).toHaveBeenCalledWith('doctor', 'du-1', 'l1', 'approve', expect.any(Object));
    expect((await request(app).post('/api/v1/doctors/me/care/links/l1/delete').set('Authorization', as('doctor'))).status).toBe(404);
  });
});

describe('patient care routes', () => {
  it('sends an invitation and answers the same way for any email', async () => {
    const res = await request(app).post('/api/v1/patients/me/care/invites').set('Authorization', as('patient')).send({ email: 'Dr.Reyes@Example.com', message: 'Hi' });
    expect(res.status).toBe(202);
    expect(CareService.inviteByEmail).toHaveBeenCalledWith('pu-1', 'dr.reyes@example.com', 'Hi', expect.any(Object));
  });

  it('is closed to doctors', async () => {
    expect((await request(app).get('/api/v1/patients/me/care').set('Authorization', as('doctor'))).status).toBe(403);
  });

  it('lets a patient end sharing', async () => {
    vi.mocked(CareService.act).mockResolvedValue({ id: 'l1', status: 'ended' });
    const res = await request(app).post('/api/v1/patients/me/care/links/l1/end').set('Authorization', as('patient'));
    expect(res.status).toBe(200);
    expect(CareService.act).toHaveBeenCalledWith('patient', 'pu-1', 'l1', 'end', expect.any(Object));
  });
});
