import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NutrientKey } from '@/lib/nutrition';

export type AnalyticsRange = 7 | 30 | 90;
type Totals = Record<NutrientKey, number>;

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

export function useAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: ['analytics', range],
    queryFn: () => api.get<{ data: PatientAnalytics }>('/analytics/me', { params: { range } }).then((r) => r.data.data),
  });
}
