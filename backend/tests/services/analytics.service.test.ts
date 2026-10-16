import { describe, expect, it } from 'vitest';
import { localDate } from '../../src/lib/time.js';
import { buildAnalytics } from '../../src/services/analytics.service.js';
import { facts } from '../fixtures/meal-facts.js';

const TZ = 'Asia/Manila';
const now = new Date('2026-10-16T05:00:00Z');
const target = { nutrient: 'sodium' as const, dailyMax: 2000, unit: 'mg', source: 'patient_entered' as const, note: null, since: '' };

describe('buildAnalytics', () => {
  const meals = [
    facts({ at: '2026-10-16T01:00:00Z', sodium: 1200, score: 9 }),
    facts({ at: '2026-10-16T04:00:00Z', sodium: 1300, score: 4 }),
    facts({ at: '2026-10-14T04:00:00Z', sodium: 1500, score: 6 }),
    facts({ at: '2026-10-13T04:00:00Z', analysed: false }),
    facts({ at: '2026-09-01T04:00:00Z', sodium: 9000 }),
  ].map((m) => ({ ...m, date: localDate(m.eatenAt, TZ) }));

  it('summarises the chosen range only', () => {
    const a = buildAnalytics({ now, timeZone: TZ, range: 7, meals, targets: [target] });
    expect(a).toMatchObject({ range: 7, from: '2026-10-10', to: '2026-10-16' });
    expect(a.days).toHaveLength(7);
    expect(a.days[6]).toEqual({ date: '2026-10-16', meals: 2, analysedMeals: 2, score: 7, totals: { sodium: 2500, potassium: 600, phosphorus: 400, protein: 40 } });
    expect(a.days[3]).toMatchObject({ date: '2026-10-13', meals: 1, analysedMeals: 0, totals: null });
    expect(a.summary).toMatchObject({ daysLogged: 3, mealsLogged: 4, analysedMeals: 3, averageScore: 6, scoreBands: { good: 1, mixed: 1, attention: 1 } });
  });

  it('averages per day with data and counts days over a supplied target', () => {
    const a = buildAnalytics({ now, timeZone: TZ, range: 7, meals, targets: [target] });
    expect(a.summary.nutrients.sodium).toEqual({ unit: 'mg', averagePerDay: 2000, daysWithData: 2, target: 2000, daysOverTarget: 1 });
    expect(a.summary.nutrients.potassium).toMatchObject({ target: null, daysOverTarget: null });
  });

  it('has no averages when nothing was analysed', () => {
    const a = buildAnalytics({ now, timeZone: TZ, range: 30, meals: [], targets: [] });
    expect(a.days).toHaveLength(30);
    expect(a.summary.nutrients.sodium.averagePerDay).toBeNull();
    expect(a.summary.averageScore).toBeNull();
  });
});
