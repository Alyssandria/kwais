import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/services/doctor-profile.service.js', () => ({
  DoctorProfileService: { get: vi.fn(), update: vi.fn() },
}));
vi.mock('../../src/services/doctor-patients.service.js', () => ({
  DoctorPatientsService: { list: vi.fn() },
}));

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');
const { DoctorProfileService } = await import('../../src/services/doctor-profile.service.js');
const { DoctorPatientsService } = await import('../../src/services/doctor-patients.service.js');

const app = createApp();
const token = (role: 'patient' | 'doctor') => `Bearer ${signAccessToken({ sub: 'd1', role }, process.env.JWT_ACCESS_SECRET!, 900)}`;
const profile = { firstName: 'Jose', lastName: 'Reyes', prcLicense: '0123456', specialty: 'Nephrology', clinic: null, updatedAt: '2026-10-22T00:00:00.000Z' };

beforeEach(() => vi.clearAllMocks());

describe('/doctors/me/profile', () => {
  it('is only for doctors', async () => {
    expect((await request(app).get('/api/v1/doctors/me/profile')).status).toBe(401);
    expect((await request(app).get('/api/v1/doctors/me/profile').set('Authorization', token('patient'))).status).toBe(403);
    expect(DoctorProfileService.get).not.toHaveBeenCalled();
  });

  it('returns the signed-in doctor’s own profile', async () => {
    vi.mocked(DoctorProfileService.get).mockResolvedValue(profile);
    const res = await request(app).get('/api/v1/doctors/me/profile').set('Authorization', token('doctor'));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(profile);
    expect(DoctorProfileService.get).toHaveBeenCalledWith('d1');
  });

  it('updates only valid fields', async () => {
    vi.mocked(DoctorProfileService.update).mockResolvedValue({ ...profile, clinic: 'PGH' });
    const bad = await request(app).patch('/api/v1/doctors/me/profile').set('Authorization', token('doctor')).send({ firstName: '', prcLicense: 'x' });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch('/api/v1/doctors/me/profile').set('Authorization', token('doctor')).send({ clinic: 'PGH', specialty: '' });
    expect(ok.status).toBe(200);
    expect(DoctorProfileService.update).toHaveBeenCalledWith('d1', { clinic: 'PGH', specialty: null }, expect.any(Object));
  });
});

describe('GET /doctors/me/patients', () => {
  it('lists the signed-in doctor’s own patients, and is closed to patients', async () => {
    vi.mocked(DoctorPatientsService.list).mockResolvedValue({ summary: { total: 0, needsAttention: 0, loggedToday: 0, targetsUnverified: 0 }, patients: [] });
    expect((await request(app).get('/api/v1/doctors/me/patients').set('Authorization', token('patient'))).status).toBe(403);
    const res = await request(app).get('/api/v1/doctors/me/patients').set('Authorization', token('doctor'));
    expect(res.status).toBe(200);
    expect(res.body.data.summary.total).toBe(0);
    expect(DoctorPatientsService.list).toHaveBeenCalledWith('d1');
  });
});
