import type { AnalysisOutput } from './ai/schemas.js';
import { MealModel } from '../models/meal.model.js';
import { lastLocalDays, localDate } from '../lib/time.js';
import { LabService, type LabView } from './lab.service.js';
import { average, rollupByDay, toFacts, type MealFacts, type Totals } from './meal-summary.js';
import { NUTRIENT_KEYS, NUTRIENT_UNITS, type NutrientKey } from './nutrition/types.js';
import { ProfileService } from './profile.service.js';
import { TargetService, type TargetView } from './target.service.js';

type Category = MealFacts['category'];

export interface PatientDashboard {
  isSample: false;
  sampleInsights: boolean;
  generatedAt: string;
  today: {
    date: string;
    mealsLogged: { category: Category; eatenAt: string }[];
    streakDays: number;
    averageScore: number | null;
    scoredMeals: number;
    nutrients: Record<
      NutrientKey,
      { value: number; unit: 'mg' | 'g'; target: number | null; targetSource: TargetView['source'] | null; hasEstimates: boolean }
    >;
    byMeal: { category: Category; values: Totals }[];
  };
  week: { date: string; score: number | null; totals: Totals | null }[];
  labs: {
    test: string;
    label: string;
    unit: string;
    refLow: number | null;
    refHigh: number | null;
    source: LabView['source'];
    history: { collectedOn: string; value: number }[];
  }[];
  consistency: { date: string; meals: number }[];
  recentMeals: { id: string; category: Category; eatenAt: string; summary: string; score: number | null; status: 'saved' | 'analysed' }[];
  insights: { id: string; title: string; body: string; source: { label: string; href: string } }[];
}

const MEAL_LABEL: Record<Category, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const CATEGORY_ORDER: Category[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const LAB_HISTORY = 6;

function dayWord(date: string, today: string, yesterday: string) {
  if (date === today) return 'today';
  if (date === yesterday) return 'yesterday';
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function buildDashboard(input: {
  now: Date;
  timeZone: string;
  meals: MealFacts[];
  targets: TargetView[];
  labs: LabView[];
}): PatientDashboard {
  const { now, timeZone, meals, targets, labs } = input;
  const { dates } = lastLocalDays(now, timeZone, 28);
  const today = localDate(now, timeZone);
  const yesterday = dates[dates.length - 2]!;
  const days = rollupByDay(dates, meals);
  const todayRoll = days.get(today)!;
  const todayMeals = meals.filter((m) => m.date === today).sort((a, b) => a.eatenAt.getTime() - b.eatenAt.getTime());

  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const count = days.get(dates[i]!)!.meals;
    if (count > 0) streak++;
    else if (i === dates.length - 1) continue;
    else break;
  }

  const target = (n: NutrientKey) => targets.find((t) => t.nutrient === n) ?? null;
  const nutrients = Object.fromEntries(
    NUTRIENT_KEYS.map((n) => [
      n,
      {
        value: todayRoll.totals[n],
        unit: NUTRIENT_UNITS[n],
        target: target(n)?.dailyMax ?? null,
        targetSource: target(n)?.source ?? null,
        hasEstimates: todayRoll.estimated[n],
      },
    ]),
  ) as PatientDashboard['today']['nutrients'];

  const byMeal = CATEGORY_ORDER.flatMap((category) => {
    const ofCategory = todayMeals.filter((m) => m.category === category && m.totals);
    if (!ofCategory.length) return [];
    const values = Object.fromEntries(
      NUTRIENT_KEYS.map((n) => [n, Math.round(ofCategory.reduce((s, m) => s + (m.totals![n]?.value ?? 0), 0) * 10) / 10]),
    ) as Totals;
    return [{ category, values }];
  });

  const labGroups = new Map<string, LabView[]>();
  for (const l of labs) {
    const key = l.test === 'other' ? `other:${l.label}` : l.test;
    labGroups.set(key, [...(labGroups.get(key) ?? []), l]);
  }
  const labSummaries = [...labGroups.entries()].map(([key, rows]) => {
    const sorted = [...rows].sort((a, b) => a.collectedOn.localeCompare(b.collectedOn));
    const latest = sorted[sorted.length - 1]!;
    return {
      test: key,
      label: latest.label,
      unit: latest.unit,
      refLow: latest.refLow,
      refHigh: latest.refHigh,
      source: latest.source,
      history: sorted.slice(-LAB_HISTORY).map((r) => ({ collectedOn: r.collectedOn, value: r.value })),
    };
  });

  const newestFirst = [...meals].sort((a, b) => b.eatenAt.getTime() - a.eatenAt.getTime());
  const ideaOf = (ai: AnalysisOutput) => {
    const action = ai.actions?.[0];
    return action ? `${action.title}. ${action.detail}` : ai.observations[0];
  };
  const withIdeas = newestFirst.filter((m) => m.ai && ideaOf(m.ai) && (m.aiStatus === 'ok' || m.aiStatus === 'mock')).slice(0, 3);
  const insights = withIdeas.map((m) => {
    const top = [...m.ai!.scoreReasons].filter((r) => (r.deduction ?? 0) > 0).sort((a, b) => (b.deduction ?? 0) - (a.deduction ?? 0))[0];
    return {
      id: m.id,
      title: top?.title ?? `From your ${MEAL_LABEL[m.category].toLowerCase()}`,
      body: ideaOf(m.ai!)!,
      source: { label: `${MEAL_LABEL[m.category]} ${dayWord(m.date, today, yesterday)}`, href: `/patient/meals/${m.id}` },
    };
  });

  return {
    isSample: false,
    sampleInsights: withIdeas.some((m) => m.aiStatus === 'mock'),
    generatedAt: now.toISOString(),
    today: {
      date: today,
      mealsLogged: todayMeals.map((m) => ({ category: m.category, eatenAt: m.eatenAt.toISOString() })),
      streakDays: streak,
      averageScore: average(todayRoll.scores),
      scoredMeals: todayRoll.scores.length,
      nutrients,
      byMeal,
    },
    week: dates.slice(-7).map((date) => {
      const d = days.get(date)!;
      return { date, score: average(d.scores), totals: d.analysed ? d.totals : null };
    }),
    labs: labSummaries,
    consistency: dates.map((date) => ({ date, meals: days.get(date)!.meals })),
    recentMeals: newestFirst.slice(0, 5).map((m) => ({
      id: m.id,
      category: m.category,
      eatenAt: m.eatenAt.toISOString(),
      summary: m.rawText.length > 120 ? `${m.rawText.slice(0, 117)}…` : m.rawText,
      score: m.score,
      status: m.status,
    })),
    insights,
  };
}

export const DashboardService = {
  async forPatient(patientId: string, now = new Date()): Promise<PatientDashboard> {
    const profile = await ProfileService.get(patientId);
    const { start } = lastLocalDays(now, profile.timezone, 28);
    const [rows, targets, labs] = await Promise.all([
      MealModel.summariesBetween(patientId, start, new Date(now.getTime() + 86_400_000)),
      TargetService.listActive(patientId),
      LabService.list(patientId),
    ]);
    return buildDashboard({ now, timeZone: profile.timezone, meals: rows.map((r) => toFacts(r, profile.timezone)), targets, labs });
  },
};
