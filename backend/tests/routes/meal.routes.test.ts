import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/models/patient-profile.model.js', () => ({
  PatientProfileModel: { findIdByUserId: vi.fn(), findById: vi.fn(), update: vi.fn() },
}));
vi.mock('../../src/services/meal.service.js', () => ({
  MealService: { list: vi.fn(), recent: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), analyse: vi.fn(), remove: vi.fn() },
}));
vi.mock('../../src/services/food.service.js', () => ({ FoodService: { search: vi.fn() } }));

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');
const { PatientProfileModel } = await import('../../src/models/patient-profile.model.js');
const { MealService } = await import('../../src/services/meal.service.js');
const { FoodService } = await import('../../src/services/food.service.js');
const { HttpError } = await import('../../src/lib/http-error.js');

const app = createApp();
const auth = (role: 'patient' | 'doctor' = 'patient') =>
  `Bearer ${signAccessToken({ sub: 'user-1', role }, process.env.JWT_ACCESS_SECRET!, 900)}`;
const MEAL_ID = '0b9a3c3e-6f1d-4c55-9c39-1a2b3c4d5e6f';
const now = () => new Date(Date.now() - 60_000).toISOString();

const valid = () => ({
  category: 'lunch',
  eatenAt: now(),
  rawText: '1 tasa kanin, isang hita ng inihaw na manok',
  condiments: [{ name: 'toyo_mansi', amount: 'konti' }],
  drinks: ['tubig'],
  cookingMethods: ['inihaw'],
  status: 'saved',
  analyse: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(PatientProfileModel.findIdByUserId).mockResolvedValue('patient-1');
});

describe('meal routes: access', () => {
  it('require a signed-in patient', async () => {
    expect((await request(app).get('/api/v1/meals')).status).toBe(401);
    expect((await request(app).get('/api/v1/meals').set('Authorization', auth('doctor'))).status).toBe(403);
  });

  it('scope everything to the signed-in patient', async () => {
    vi.mocked(MealService.list).mockResolvedValue([]);
    await request(app).get('/api/v1/meals?patientId=someone-else&status=draft&limit=1').set('Authorization', auth());
    expect(MealService.list).toHaveBeenCalledWith('patient-1', { status: 'draft', limit: 1 });
  });

  it('treat a malformed id as not found', async () => {
    const res = await request(app).get('/api/v1/meals/not-a-uuid').set('Authorization', auth());
    expect(res.status).toBe(404);
    expect(MealService.get).not.toHaveBeenCalled();
  });
});

describe('POST /meals', () => {
  it('creates a valid meal', async () => {
    vi.mocked(MealService.create).mockResolvedValue({ id: MEAL_ID } as never);
    const res = await request(app).post('/api/v1/meals').set('Authorization', auth()).send(valid());
    expect(res.status).toBe(201);
    expect(MealService.create).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ eatenAt: expect.any(Date), analyse: true, condiments: [{ name: 'toyo_mansi', amount: 'konti' }] }),
      'user-1',
      expect.any(Object),
    );
  });

  it('needs food text for a saved meal, but not for a draft', async () => {
    const saved = await request(app).post('/api/v1/meals').set('Authorization', auth()).send({ ...valid(), rawText: ' ' });
    expect(saved.status).toBe(400);
    expect(saved.body.error.details).toEqual([{ path: 'rawText', message: 'Tell us what you ate' }]);

    vi.mocked(MealService.create).mockResolvedValue({ id: MEAL_ID } as never);
    const draft = await request(app).post('/api/v1/meals').set('Authorization', auth()).send({ ...valid(), rawText: '', status: 'draft' });
    expect(draft.status).toBe(201);
  });

  it('rejects unknown chips, repeated condiments, future and old times, and extra fields', async () => {
    const cases = [
      { condiments: [{ name: 'ketchup_ni_lola', amount: 'konti' }] },
      { condiments: [{ name: 'toyo', amount: 'konti' }, { name: 'toyo', amount: 'tbsp' }] },
      { drinks: ['beer'] },
      { eatenAt: new Date(Date.now() + 60 * 60_000).toISOString() },
      { eatenAt: new Date(Date.now() - 8 * 86_400_000).toISOString() },
      { patientId: 'someone-else' },
    ];
    for (const extra of cases) {
      const res = await request(app).post('/api/v1/meals').set('Authorization', auth()).send({ ...valid(), ...extra });
      expect(res.status, JSON.stringify(extra)).toBe(400);
    }
    expect(MealService.create).not.toHaveBeenCalled();
  });
});

describe('other meal routes', () => {
  it('PATCH passes only the fields sent', async () => {
    vi.mocked(MealService.update).mockResolvedValue({ id: MEAL_ID } as never);
    const res = await request(app).patch(`/api/v1/meals/${MEAL_ID}`).set('Authorization', auth()).send({ rawText: 'kanin' });
    expect(res.status).toBe(200);
    expect(MealService.update).toHaveBeenCalledWith('patient-1', MEAL_ID, { rawText: 'kanin' }, 'user-1', expect.any(Object));
  });

  it('analyse, recent and delete reach the service', async () => {
    vi.mocked(MealService.analyse).mockResolvedValue({ id: MEAL_ID } as never);
    vi.mocked(MealService.recent).mockResolvedValue([]);
    expect((await request(app).post(`/api/v1/meals/${MEAL_ID}/analyse`).set('Authorization', auth())).status).toBe(200);
    expect((await request(app).get('/api/v1/meals/recent').set('Authorization', auth())).status).toBe(200);
    expect((await request(app).delete(`/api/v1/meals/${MEAL_ID}`).set('Authorization', auth())).status).toBe(204);
    expect(MealService.remove).toHaveBeenCalledWith('patient-1', MEAL_ID, 'user-1', expect.any(Object));
  });

  it('streams each analysis step as a line of JSON when asked', async () => {
    vi.mocked(MealService.get).mockResolvedValue({ id: MEAL_ID } as never);
    vi.mocked(MealService.analyse).mockImplementation(async (_p, _id, _u, _m, onStep) => {
      onStep?.('reading');
      onStep?.('calculating');
      return { id: MEAL_ID } as never;
    });
    const res = await request(app).post(`/api/v1/meals/${MEAL_ID}/analyse`).set('Authorization', auth()).set('Accept', 'application/x-ndjson');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/x-ndjson/);
    expect(res.text.trim().split('\n').map((l) => JSON.parse(l))).toEqual([
      { step: 'reading' },
      { step: 'calculating' },
      { done: true, data: { id: MEAL_ID } },
    ]);
  });

  it('ends the stream with the error when analysis fails', async () => {
    vi.mocked(MealService.get).mockResolvedValue({ id: MEAL_ID } as never);
    vi.mocked(MealService.analyse).mockRejectedValue(HttpError.conflict('Save the meal before analysing it'));
    const res = await request(app).post(`/api/v1/meals/${MEAL_ID}/analyse`).set('Authorization', auth()).set('Accept', 'application/x-ndjson');
    expect(res.text.trim().split('\n').map((l) => JSON.parse(l))).toEqual([{ error: { code: 'conflict', message: 'Save the meal before analysing it' } }]);
  });

  it('answers 404 before streaming when the meal is not theirs', async () => {
    vi.mocked(MealService.get).mockRejectedValue(HttpError.notFound('Meal not found'));
    const res = await request(app).post(`/api/v1/meals/${MEAL_ID}/analyse`).set('Authorization', auth()).set('Accept', 'application/x-ndjson');
    expect(res.status).toBe(404);
    expect(MealService.analyse).not.toHaveBeenCalled();
  });

  it('GET /foods searches for signed-in users', async () => {
    vi.mocked(FoodService.search).mockResolvedValue([]);
    expect((await request(app).get('/api/v1/foods?q=kanin')).status).toBe(401);
    expect((await request(app).get('/api/v1/foods?q=kanin').set('Authorization', auth())).status).toBe(200);
    expect(FoodService.search).toHaveBeenCalledWith('kanin');
  });
});
