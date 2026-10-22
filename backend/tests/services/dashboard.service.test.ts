import { describe, expect, it } from 'vitest';
import { localDate } from '../../src/lib/time.js';
import { buildDashboard } from '../../src/services/dashboard.service.js';
import type { MealFacts } from '../../src/services/meal-summary.js';
import { facts } from '../fixtures/meal-facts.js';

const TZ = 'Asia/Manila';
const now = new Date('2026-10-16T05:00:00Z');
const withDate = (m: MealFacts) => ({ ...m, date: localDate(m.eatenAt, TZ) });
const meals = (...ms: MealFacts[]) => ms.map(withDate);

const target = { nutrient: 'sodium' as const, dailyMax: 2000, unit: 'mg', source: 'patient_entered' as const, note: null, since: '' };
const lab = (collectedOn: string, value: number) => ({
  id: collectedOn,
  test: 'potassium' as const,
  label: 'Potassium',
  value,
  refLow: 3.5,
  refHigh: 5.1,
  unit: 'mmol/L',
  collectedOn,
  labName: null,
  source: 'patient_entered' as const,
  createdAt: '',
});

describe('buildDashboard', () => {
  it('adds up today in the patient’s time zone', () => {
    const d = buildDashboard({
      now,
      timeZone: TZ,
      meals: meals(
        facts({ at: '2026-10-15T23:30:00Z', category: 'breakfast', sodium: 400, score: 8 }),
        facts({ at: '2026-10-16T04:00:00Z', category: 'lunch', sodium: 1700, score: 5 }),
        facts({ at: '2026-10-16T04:30:00Z', category: 'snack', analysed: false }),
        facts({ at: '2026-10-15T15:00:00Z', category: 'dinner', sodium: 900 }),
      ),
      targets: [target],
      labs: [],
    });
    expect(d.today.date).toBe('2026-10-16');
    expect(d.today.mealsLogged.map((m) => m.category)).toEqual(['breakfast', 'lunch', 'snack']);
    expect(d.today.nutrients.sodium).toEqual({ value: 2100, unit: 'mg', target: 2000, targetSource: 'patient_entered', hasEstimates: true });
    expect(d.today.nutrients.protein).toMatchObject({ value: 40, target: null, hasEstimates: false });
    expect(d.today.averageScore).toBe(7);
    expect(d.today.scoredMeals).toBe(2);
    expect(d.today.byMeal.map((b) => [b.category, b.values.sodium])).toEqual([
      ['breakfast', 400],
      ['lunch', 1700],
    ]);
    expect(d.week).toHaveLength(7);
    expect(d.week[5]).toEqual({ date: '2026-10-15', score: null, totals: { sodium: 900, potassium: 300, phosphorus: 200, protein: 20 } });
    expect(d.week[4]!.totals).toBeNull();
  });

  it('counts the streak back from today, or from yesterday before the first meal of the day', () => {
    const run = (ats: string[]) =>
      buildDashboard({ now, timeZone: TZ, meals: meals(...ats.map((at) => facts({ at }))), targets: [], labs: [] }).today.streakDays;
    expect(run(['2026-10-16T01:00:00Z', '2026-10-15T01:00:00Z', '2026-10-14T01:00:00Z', '2026-10-12T01:00:00Z'])).toBe(3);
    expect(run(['2026-10-15T01:00:00Z', '2026-10-14T01:00:00Z'])).toBe(2);
    expect(run(['2026-10-13T01:00:00Z'])).toBe(0);
  });

  it('shows 28 days of logging, oldest first', () => {
    const d = buildDashboard({ now, timeZone: TZ, meals: meals(facts({ at: '2026-09-19T01:00:00Z' }), facts({ at: '2026-10-16T01:00:00Z' })), targets: [], labs: [] });
    expect(d.consistency).toHaveLength(28);
    expect(d.consistency[0]).toEqual({ date: '2026-09-19', meals: 1 });
    expect(d.consistency[27]).toEqual({ date: '2026-10-16', meals: 1 });
  });

  it('groups lab history per test, oldest to newest, with the newest range', () => {
    const d = buildDashboard({ now, timeZone: TZ, meals: [], targets: [], labs: [lab('2026-09-28', 5.6), lab('2026-06-20', 5.0)] });
    expect(d.labs).toEqual([
      expect.objectContaining({ test: 'potassium', refHigh: 5.1, history: [{ collectedOn: '2026-06-20', value: 5 }, { collectedOn: '2026-09-28', value: 5.6 }] }),
    ]);
  });

  it('turns the newest AI actions or observations into insights, and flags sample text', () => {
    const ai = {
      score: 6,
      scoreReasons: [
        { title: 'Sodium is over your target', detail: '…', deduction: 2, basis: 'target' as const },
        { title: 'Phosphorus not scored', detail: '…', deduction: null, basis: 'not_scored' as const },
      ],
      summary: '…',
      actions: [] as { title: string; detail: string }[],
      observations: ['Calamansi on its own has less sodium.'],
      concerns: [],
      clinicianQuestions: [],
      dataQuality: '…',
      usedInputs: [],
    };
    const d = buildDashboard({
      now,
      timeZone: TZ,
      meals: meals(
        facts({ at: '2026-10-16T04:00:00Z', ai, aiStatus: 'ok', score: 6 }),
        facts({ at: '2026-10-15T11:00:00Z', category: 'dinner', ai: { ...ai, scoreReasons: [], actions: [{ title: 'Swap the sawsawan', detail: 'Try suka instead of patis.' }] }, aiStatus: 'mock' }),
      ),
      targets: [],
      labs: [],
    });
    expect(d.insights).toEqual([
      { id: 'meal-2026-10-16T04:00:00Z', title: 'Sodium is over your target', body: 'Calamansi on its own has less sodium.', source: { label: 'Lunch today', href: '/patient/meals/meal-2026-10-16T04:00:00Z' } },
      { id: 'meal-2026-10-15T11:00:00Z', title: 'From your dinner', body: 'Swap the sawsawan. Try suka instead of patis.', source: { label: 'Dinner yesterday', href: '/patient/meals/meal-2026-10-15T11:00:00Z' } },
    ]);
    expect(d.sampleInsights).toBe(true);
    expect(d.recentMeals[0]).toMatchObject({ status: 'analysed', score: 6, summary: '1 tasa kanin' });
  });
});
