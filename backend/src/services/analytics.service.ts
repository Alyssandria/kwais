import { MealModel } from '../models/meal.model.js';
import { lastLocalDays } from '../lib/time.js';
import { average, rollupByDay, round1, toFacts, type MealFacts, type Totals } from './meal-summary.js';
import { NUTRIENT_KEYS, NUTRIENT_UNITS, type NutrientKey } from './nutrition/types.js';
import { ProfileService } from './profile.service.js';
import { TargetService, type TargetView } from './target.service.js';

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export interface PatientAnalytics {
  range: AnalyticsRange;
  from: string;
  to: string;
  days: { date: string; meals: number; analysedMeals: number; score: number | null; totals: Totals | null }[];
  summary: {
    daysLogged: number;
    mealsLogged: number;
    analysedMeals: number;
    averageScore: number | null;
    scoreBands: { good: number; mixed: number; attention: number };
    nutrients: Record<
      NutrientKey,
      { unit: 'mg' | 'g'; averagePerDay: number | null; daysWithData: number; target: number | null; daysOverTarget: number | null }
    >;
  };
}

export function buildAnalytics(input: { now: Date; timeZone: string; range: AnalyticsRange; meals: MealFacts[]; targets: TargetView[] }): PatientAnalytics {
  const { dates } = lastLocalDays(input.now, input.timeZone, input.range);
  const days = rollupByDay(dates, input.meals);
  const rolled = dates.map((d) => days.get(d)!);
  const withData = rolled.filter((d) => d.analysed > 0);
  const scores = rolled.flatMap((d) => d.scores);

  const nutrients = Object.fromEntries(
    NUTRIENT_KEYS.map((n) => {
      const target = input.targets.find((t) => t.nutrient === n)?.dailyMax ?? null;
      return [
        n,
        {
          unit: NUTRIENT_UNITS[n],
          averagePerDay: withData.length ? round1(withData.reduce((s, d) => s + d.totals[n], 0) / withData.length) : null,
          daysWithData: withData.length,
          target,
          daysOverTarget: target == null ? null : withData.filter((d) => d.totals[n] > target).length,
        },
      ];
    }),
  ) as PatientAnalytics['summary']['nutrients'];

  return {
    range: input.range,
    from: dates[0]!,
    to: dates[dates.length - 1]!,
    days: rolled.map((d) => ({
      date: d.date,
      meals: d.meals,
      analysedMeals: d.analysed,
      score: average(d.scores),
      totals: d.analysed ? d.totals : null,
    })),
    summary: {
      daysLogged: rolled.filter((d) => d.meals > 0).length,
      mealsLogged: input.meals.filter((m) => days.has(m.date)).length,
      analysedMeals: rolled.reduce((s, d) => s + d.analysed, 0),
      averageScore: average(scores),
      scoreBands: {
        good: scores.filter((s) => s >= 8).length,
        mixed: scores.filter((s) => s >= 5 && s < 8).length,
        attention: scores.filter((s) => s < 5).length,
      },
      nutrients,
    },
  };
}

export const AnalyticsService = {
  async forPatient(patientId: string, range: AnalyticsRange, now = new Date()): Promise<PatientAnalytics> {
    const profile = await ProfileService.get(patientId);
    const { start } = lastLocalDays(now, profile.timezone, range);
    const [rows, targets] = await Promise.all([
      MealModel.summariesBetween(patientId, start, new Date(now.getTime() + 86_400_000)),
      TargetService.listActive(patientId),
    ]);
    return buildAnalytics({ now, timeZone: profile.timezone, range, meals: rows.map((r) => toFacts(r, profile.timezone)), targets });
  },
};
