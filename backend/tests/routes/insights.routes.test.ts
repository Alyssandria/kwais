import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/models/patient-profile.model.js', () => ({
  PatientProfileModel: { findIdByUserId: vi.fn(), findById: vi.fn(), update: vi.fn() },
}));
vi.mock('../../src/services/dashboard.service.js', () => ({ DashboardService: { forPatient: vi.fn() } }));
vi.mock('../../src/services/analytics.service.js', () => ({ AnalyticsService: { forPatient: vi.fn() } }));
vi.mock('../../src/services/notification.service.js', () => ({
  NotificationService: { list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { DashboardService } = await import('../../src/services/dashboard.service.js');
const { AnalyticsService } = await import('../../src/services/analytics.service.js');
const { NotificationService } = await import('../../src/services/notification.service.js');

const app = createApp();
const auth = (role: 'patient' | 'doctor' = 'patient') => `Bearer ${signAccessToken({ sub: 'user-1', role }, process.env.JWT_ACCESS_SECRET!, 900)}`;
const ID = '0b9a3c3e-6f1d-4c55-9c39-1a2b3c4d5e6f';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PatientProfileModel.findIdByUserId).mockResolvedValue('patient-1');
});

describe('dashboard and analytics', () => {
  it('serve the signed-in patient only', async () => {
    expect((await request(app).get('/api/v1/dashboard/patient')).status).toBe(401);
    expect((await request(app).get('/api/v1/analytics/me').set('Authorization', auth('doctor'))).status).toBe(403);
    vi.mocked(DashboardService.forPatient).mockResolvedValue({ isSample: false } as never);
    const res = await request(app).get('/api/v1/dashboard/patient').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(DashboardService.forPatient).toHaveBeenCalledWith('patient-1');
  });

  it('accept only 7, 30 or 90 days, defaulting to 30', async () => {
    vi.mocked(AnalyticsService.forPatient).mockResolvedValue({} as never);
    await request(app).get('/api/v1/analytics/me').set('Authorization', auth());
    expect(AnalyticsService.forPatient).toHaveBeenLastCalledWith('patient-1', 30);
    await request(app).get('/api/v1/analytics/me?range=7').set('Authorization', auth());
    expect(AnalyticsService.forPatient).toHaveBeenLastCalledWith('patient-1', 7);
    expect((await request(app).get('/api/v1/analytics/me?range=365').set('Authorization', auth())).status).toBe(400);
  });
});

describe('notifications', () => {
  it('list with the unread count', async () => {
    vi.mocked(NotificationService.list).mockResolvedValue({ items: [], unread: 2 });
    const res = await request(app).get('/api/v1/notifications').set('Authorization', auth());
    expect(res.body).toEqual({ data: [], meta: { unread: 2 } });
    expect(NotificationService.list).toHaveBeenCalledWith('user-1');
  });

  it('mark one or all as read', async () => {
    expect((await request(app).post(`/api/v1/notifications/${ID}/read`).set('Authorization', auth())).status).toBe(204);
    expect(NotificationService.markRead).toHaveBeenCalledWith('user-1', ID);
    expect((await request(app).post('/api/v1/notifications/nope/read').set('Authorization', auth())).status).toBe(404);
    vi.mocked(NotificationService.markAllRead).mockResolvedValue(3);
    expect((await request(app).post('/api/v1/notifications/read-all').set('Authorization', auth())).body).toEqual({ data: { marked: 3 } });
  });
});
