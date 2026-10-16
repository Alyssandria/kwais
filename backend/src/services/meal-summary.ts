import type { MealSummaryRecord } from '../models/meal.model.js';
import { localDate } from '../lib/time.js';
import type { AnalysisOutput } from './ai/schemas.js';
import { NUTRIENT_KEYS, type NutrientKey, type NutrientTotal } from './nutrition/types.js';

export type Totals = Record<NutrientKey, number>;

export const zeroTotals = (): Totals => ({ sodium: 0, potassium: 0, phosphorus: 0, protein: 0 });
export const round1 = (n: number) => Math.round(n * 10) / 10;

export interface MealFacts {
  id: string;
  date: string;
  eatenAt: Date;
  category: MealSummaryRecord['category'];
  rawText: string;
  status: 'saved' | 'analysed';
  totals: Record<NutrientKey, NutrientTotal> | null;
  score: number | null;
  aiStatus: 'ok' | 'unavailable' | 'mock' | null;
  ai: AnalysisOutput | null;
}

export function toFacts(m: MealSummaryRecord, timeZone: string): MealFacts {
  const a = m.analyses[0];
  return {
    id: m.id,
    date: localDate(m.eatenAt, timeZone),
    eatenAt: m.eatenAt,
    category: m.category,
    rawText: m.rawText,
    status: m.status === 'analysed' ? 'analysed' : 'saved',
    totals: (a?.totals as unknown as Record<NutrientKey, NutrientTotal>) ?? null,
    score: a?.score ?? null,
    aiStatus: a?.aiStatus ?? null,
    ai: (a?.aiOutput as AnalysisOutput | null) ?? null,
  };
}

export interface DayRollup {
  date: string;
  meals: number;
  analysed: number;
  scores: number[];
  totals: Totals;
  estimated: Record<NutrientKey, boolean>;
}

export function rollupByDay(dates: string[], meals: MealFacts[]): Map<string, DayRollup> {
  const days = new Map<string, DayRollup>(
    dates.map((date) => [
      date,
      { date, meals: 0, analysed: 0, scores: [], totals: zeroTotals(), estimated: { sodium: false, potassium: false, phosphorus: false, protein: false } },
    ]),
  );
  for (const m of meals) {
    const d = days.get(m.date);
    if (!d) continue;
    d.meals++;
    if (m.score != null) d.scores.push(m.score);
    if (!m.totals) continue;
    d.analysed++;
    for (const n of NUTRIENT_KEYS) {
      d.totals[n] += m.totals[n]?.value ?? 0;
      if (m.totals[n] && m.totals[n].source !== 'verified') d.estimated[n] = true;
    }
  }
  for (const d of days.values()) for (const n of NUTRIENT_KEYS) d.totals[n] = round1(d.totals[n]);
  return days;
}

export const average = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
