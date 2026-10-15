import type { NutrientKey } from '@/lib/nutrition';

/**
 * Shape of GET /api/v1/dashboard/patient (built in Section 8).
 * The dashboard UI reads only this type, so swapping sample data for the API changes nothing else.
 * Dates are ISO strings (YYYY-MM-DD or full timestamps) as JSON would carry them.
 */
export interface PatientDashboard {
  /** True while the dashboard shows fictional sample data instead of the patient's records. */
  isSample: boolean;
  generatedAt: string;
  today: {
    date: string;
    mealsLogged: { category: MealCategory; eatenAt: string }[];
    streakDays: number;
    /** Average of today's analysed meal scores; null when no scored meal yet. */
    averageScore: number | null;
    scoredMeals: number;
    nutrients: Record<NutrientKey, TodayNutrient>;
    /** Per-meal contribution to today's totals. */
    byMeal: { category: MealCategory; values: Record<NutrientKey, number> }[];
  };
  /** Oldest first, 7 entries ending today. Totals are null on days with no logged meals. */
  week: DaySummary[];
  labs: LabSummary[];
  /** Oldest first, 28 entries ending today. */
  consistency: { date: string; meals: number }[];
  recentMeals: RecentMeal[];
  insights: Insight[];
}

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface TodayNutrient {
  value: number;
  unit: 'mg' | 'g';
  /** Daily maximum from an active target, or null when none is set. */
  target: number | null;
  targetSource: 'patient_entered' | 'clinician_verified' | null;
  /** True when part of the total comes from recipe estimates or guessed amounts. */
  hasEstimates: boolean;
}

export interface DaySummary {
  date: string;
  score: number | null;
  totals: Record<NutrientKey, number> | null;
}

export interface LabSummary {
  test: string;
  label: string;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  source: 'patient_entered' | 'clinician_verified';
  /** Oldest first. */
  history: { collectedOn: string; value: number }[];
}

export interface RecentMeal {
  id: string;
  category: MealCategory;
  eatenAt: string;
  summary: string;
  score: number | null;
  status: 'saved' | 'analysed';
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  source: { label: string; href: string };
}
