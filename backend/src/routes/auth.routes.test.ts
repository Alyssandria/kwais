import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../services/auth.service.js', () => ({
  AuthService: {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    me: vi.fn(),
  },
}));

const { createApp } = await import('../app.js');
const { AuthService } = await import('../services/auth.service.js');
const { signAccessToken } = await import('../lib/jwt.js');

const app = createApp();
const user = {
  id: 'u1', email: 'maria@example.com', role: 'patient' as const,
  firstName: 'Maria', lastName: 'Santos', patientCode: 'KW-000123', onboardingComplete: false,
};
const session = {
  user,
  accessToken: 'access.token.here',
  accessTokenExpiresIn: 900,
  refreshToken: 'refresh-token-value',
  refreshTokenExpiresAt: new Date(Date.now() + 86_400_000),
};

beforeEach(() => vi.clearAllMocks());

describe('POST /auth/register', () => {
  it('validates the body and lists field errors', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password', 'firstName', 'acceptTerms', 'acceptHealthData']));
    expect(AuthService.register).not.toHaveBeenCalled();
  });

  it('sets the refresh cookie and never returns the refresh token in the body', async () => {
    vi.mocked(AuthService.register).mockResolvedValue(session);
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'maria@example.com', password: 'kidney-care-2026', firstName: 'Maria', lastName: 'Santos',
      acceptTerms: true, acceptHealthData: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ user, accessToken: 'access.token.here', expiresIn: 900 });
    expect(JSON.stringify(res.body)).not.toContain('refresh-token-value');
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain('kwais_rt=refresh-token-value');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');
  });
});

describe('GET /auth/me', () => {
  it('requires a bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a forged token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer a.b.c');
    expect(res.status).toBe(401);
  });

  it('returns the user for a valid token', async () => {
    vi.mocked(AuthService.me).mockResolvedValue(user);
    const token = signAccessToken({ sub: 'u1', role: 'patient' }, process.env.JWT_ACCESS_SECRET!, 900);
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('maria@example.com');
    expect(AuthService.me).toHaveBeenCalledWith('u1');
  });

  it('says token_expired so the client knows to refresh', async () => {
    const token = signAccessToken({ sub: 'u1', role: 'patient' }, process.env.JWT_ACCESS_SECRET!, 60, Date.now() - 3600_000);
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('token_expired');
  });
});

describe('POST /auth/refresh and /logout', () => {
  it('reads the cookie and rotates it', async () => {
    vi.mocked(AuthService.refresh).mockResolvedValue({ ...session, refreshToken: 'rotated' });
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', 'kwais_rt=old');
    expect(res.status).toBe(200);
    expect(AuthService.refresh).toHaveBeenCalledWith('old', expect.any(Object));
    expect(String(res.headers['set-cookie'])).toContain('kwais_rt=rotated');
  });

  it('clears the cookie on logout', async () => {
    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', 'kwais_rt=old');
    expect(res.status).toBe(204);
    expect(AuthService.logout).toHaveBeenCalledWith('old');
    expect(String(res.headers['set-cookie'])).toMatch(/kwais_rt=;/);
  });
});

describe('POST /auth/forgot-password', () => {
  it('answers the same way whether or not the email exists', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'anyone@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/if an account exists/i);
  });
});
