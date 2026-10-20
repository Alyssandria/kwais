import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/models/patient-profile.model.js', () => ({ PatientProfileModel: { findIdByUserId: vi.fn() } }));
vi.mock('../../src/services/privacy.service.js', () => ({
  PrivacyService: { exportData: vi.fn(), activity: vi.fn(), deleteAccount: vi.fn() },
}));
vi.mock('../../src/services/auth.service.js', async (original) => ({
  ...(await original<typeof import('../../src/services/auth.service.js')>()),
  AuthService: { changePassword: vi.fn(), logoutEverywhere: vi.fn() },
}));

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { PrivacyService } = await import('../../src/services/privacy.service.js');
const { AuthService } = await import('../../src/services/auth.service.js');

const app = createApp();
const token = (role: 'patient' | 'doctor' = 'patient') => `Bearer ${signAccessToken({ sub: 'user-1', role }, process.env.JWT_ACCESS_SECRET!, 900)}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PatientProfileModel.findIdByUserId).mockResolvedValue('patient-1');
});

describe('GET /patients/me/export', () => {
  it('downloads a JSON file that is never cached', async () => {
    vi.mocked(PrivacyService.exportData).mockResolvedValue({ filename: 'kwais-export-KW-000123-2026-10-20.json', body: { format: 'kwais-export' } });
    const res = await request(app).get('/api/v1/patients/me/export').set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('kwais-export-KW-000123-2026-10-20.json');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(JSON.parse(res.text)).toEqual({ format: 'kwais-export' });
    expect(PrivacyService.exportData).toHaveBeenCalledWith('user-1', expect.any(Object));
  });

  it('needs a signed-in patient', async () => {
    expect((await request(app).get('/api/v1/patients/me/export')).status).toBe(401);
    expect((await request(app).get('/api/v1/patients/me/export').set('Authorization', token('doctor'))).status).toBe(403);
  });
});

describe('GET /patients/me/activity', () => {
  it('passes a bounded limit', async () => {
    vi.mocked(PrivacyService.activity).mockResolvedValue([]);
    await request(app).get('/api/v1/patients/me/activity?limit=20').set('Authorization', token());
    expect(PrivacyService.activity).toHaveBeenCalledWith('user-1', 20);
    const res = await request(app).get('/api/v1/patients/me/activity?limit=5000').set('Authorization', token());
    expect(res.status).toBe(400);
  });
});

describe('POST /patients/me/delete-account', () => {
  it('requires the password and the word DELETE', async () => {
    const res = await request(app).post('/api/v1/patients/me/delete-account').set('Authorization', token()).send({ password: 'x', confirm: 'delete' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toContain('confirm');
    expect(PrivacyService.deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes and clears the session cookie', async () => {
    vi.mocked(PrivacyService.deleteAccount).mockResolvedValue();
    const res = await request(app).post('/api/v1/patients/me/delete-account').set('Authorization', token()).send({ password: 'pw', confirm: 'DELETE' });
    expect(res.status).toBe(204);
    expect(PrivacyService.deleteAccount).toHaveBeenCalledWith('user-1', 'pw', expect.any(Object));
    expect(String(res.headers['set-cookie'])).toMatch(/kwais_rt=;/);
  });
});

describe('account controls', () => {
  it('signs out everywhere', async () => {
    const res = await request(app).post('/api/v1/auth/logout-all').set('Authorization', token());
    expect(res.status).toBe(204);
    expect(AuthService.logoutEverywhere).toHaveBeenCalledWith('user-1', expect.any(Object));
  });

  it('checks the new password rules before changing it', async () => {
    const res = await request(app).post('/api/v1/auth/change-password').set('Authorization', token()).send({ currentPassword: 'old', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(AuthService.changePassword).not.toHaveBeenCalled();
  });
});
