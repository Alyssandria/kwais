import type { NutrientKey } from '@/lib/nutrition';

export interface PatientDashboard {
  isSample: boolean;
  generatedAt: string;
  today: {
    date: string;
    mealsLogged: { category: MealCategory; eatenAt: string }[];
    streakDays: number;
    averageScore: number | null;
    scoredMeals: number;
    nutrients: Record<NutrientKey, TodayNutrient>;
    byMeal: { category: MealCategory; values: Record<NutrientKey, number> }[];
  };
  week: DaySummary[];
  labs: LabSummary[];
  consistency: { date: string; meals: number }[];
  recentMeals: RecentMeal[];
  insights: Insight[];
}

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface TodayNutrient {
  value: number;
  unit: 'mg' | 'g';
  target: number | null;
  targetSource: 'patient_entered' | 'clinician_verified' | null;
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
