import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { scopedApiPath, scopedKey, usePatientScope } from '@/lib/patient-scope';
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
  const scope = usePatientScope();
  return useQuery({
    queryKey: scopedKey(['analytics', range], scope),
    queryFn: () => api.get<{ data: PatientAnalytics }>(scopedApiPath(scope, '/analytics/me'), { params: { range } }).then((r) => r.data.data),
  });
}
