import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NutrientKey } from '@/lib/nutrition';

/** Shapes returned by the backend (see backend/src/services/meal.service.ts). */

export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealStatus = 'draft' | 'saved' | 'analysed';
export type CondimentAmount = 'konti' | 'tsp' | 'tbsp' | 'marami';
export type Provenance = 'verified' | 'estimated' | 'missing';

export interface MealCondiment {
  name: string;
  amount: CondimentAmount;
}

export interface NutrientTotal {
  value: number | null;
  unit: 'mg' | 'g';
  source: Provenance;
  complete: boolean;
}

export interface AnalysedItem {
  kind: 'food' | 'condiment' | 'drink';
  label: string;
  quantity: number;
  unit: string;
  grams: number | null;
  preparation: string | null;
  amountGuessed: boolean;
  match: { foodId: string; name: string; source: string; sourceRef: string; verified: boolean; confidence: number } | null;
  nutrients: Record<NutrientKey, { value: number | null; source: Provenance }>;
}

export interface DataNote {
  code: 'unmatched' | 'amount_guessed' | 'no_portion' | 'no_value' | 'unverified_food' | 'nothing_to_count';
  message: string;
  items?: string[];
  nutrient?: NutrientKey;
}

export interface MealAnalysis {
  id: string;
  version: number;
  engineVersion: string;
  createdAt: string;
  totals: Record<NutrientKey, NutrientTotal>;
  items: AnalysedItem[];
  notes: DataNote[];
  score: number | null;
  scoreBand: string | null;
  ai: { status: 'ok' | 'unavailable' | 'mock'; output: unknown };
}

export interface Meal {
  id: string;
  category: MealCategory;
  eatenAt: string;
  rawText: string;
  condiments: MealCondiment[];
  drinks: string[];
  cookingMethods: string[];
  notes: string | null;
  status: MealStatus;
  createdAt: string;
  updatedAt: string;
  analysis: MealAnalysis | null;
}

export interface RecentMeal {
  mealId: string;
  category: MealCategory;
  eatenAt: string;
  rawText: string;
  condiments: MealCondiment[];
  drinks: string[];
  cookingMethods: string[];
}

export interface MealInput {
  category: MealCategory;
  eatenAt: string;
  rawText: string;
  condiments: MealCondiment[];
  drinks: string[];
  cookingMethods: string[];
  notes: string | null;
  status: 'draft' | 'saved';
  analyse: boolean;
}

const unwrap = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const mealKeys = {
  all: ['meals'] as const,
  list: (params: Record<string, unknown>) => ['meals', 'list', params] as const,
  recent: ['meals', 'recent'] as const,
  one: (id: string) => ['meals', 'one', id] as const,
};

export function useMeal(id: string | undefined) {
  return useQuery({
    queryKey: mealKeys.one(id ?? ''),
    queryFn: () => unwrap<Meal>(api.get(`/meals/${id}`)),
    enabled: !!id,
  });
}

export function useRecentMeals() {
  return useQuery({ queryKey: mealKeys.recent, queryFn: () => unwrap<RecentMeal[]>(api.get('/meals/recent')) });
}

/** The newest unfinished draft, if any. */
export function useLatestDraft() {
  return useQuery({
    queryKey: mealKeys.list({ status: 'draft', limit: 1 }),
    queryFn: () => unwrap<Meal[]>(api.get('/meals', { params: { status: 'draft', limit: 1 } })).then((r) => r[0] ?? null),
  });
}

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MealInput) => unwrap<Meal>(api.post('/meals', input)),
    onSuccess: (m) => {
      qc.setQueryData(mealKeys.one(m.id), m);
      void qc.invalidateQueries({ queryKey: mealKeys.all });
    },
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MealInput> }) => unwrap<Meal>(api.patch(`/meals/${id}`, input)),
    onSuccess: (m) => {
      qc.setQueryData(mealKeys.one(m.id), m);
      void qc.invalidateQueries({ queryKey: mealKeys.all });
    },
  });
}

export function useAnalyseMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<Meal>(api.post(`/meals/${id}/analyse`)),
    onSuccess: (m) => qc.setQueryData(mealKeys.one(m.id), m),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/meals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: mealKeys.all }),
  });
}
