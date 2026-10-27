import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, streamLines } from '@/lib/api';
import { scopedApiPath, scopedKey, usePatientScope } from '@/lib/patient-scope';
import type { NutrientKey } from '@/lib/nutrition';

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

export interface AiAnalysis {
  score: number | null;
  scoreReasons: {
    title: string;
    detail: string;
    deduction: number | null;
    basis?: 'target' | 'guidance' | 'lab' | 'restriction' | 'allergy' | 'meal_share' | 'description' | 'not_scored';
  }[];
  summary: string;
  actions?: { title: string; detail: string }[];
  observations: string[];
  concerns: string[];
  clinicianQuestions: string[];
  dataQuality: string;
  usedInputs: string[];
  scoreBasis?: 'personal' | 'general' | null;
}

type Totals = Record<NutrientKey, number>;

export interface MealAnalysis {
  id: string;
  version: number;
  engineVersion: string;
  createdAt: string;
  totals: Record<NutrientKey, NutrientTotal>;
  items: AnalysedItem[];
  notes: DataNote[];
  day: { date: string; earlierMeals: number; totalsBeforeMeal: Totals; totalsWithMeal: Totals } | null;
  score: number | null;
  scoreBand: 'good' | 'mixed' | 'attention' | null;
  parser: string | null;
  ai: {
    status: 'ok' | 'unavailable' | 'mock';
    reason: 'no_consent' | 'ai_error' | null;
    output: AiAnalysis | null;
    model: string | null;
    promptVersion: string | null;
  };
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
  const scope = usePatientScope();
  return useQuery({
    queryKey: scopedKey(mealKeys.one(id ?? ''), scope),
    queryFn: () => unwrap<Meal>(api.get(scopedApiPath(scope, `/meals/${id}`))),
    enabled: !!id,
  });
}

const refreshSummaries = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: mealKeys.all });
  void qc.invalidateQueries({ queryKey: ['dashboard'] });
  void qc.invalidateQueries({ queryKey: ['analytics'] });
};

export const HISTORY_PAGE = 20;

export function useMealHistory(filters: { status?: MealStatus; category?: MealCategory }) {
  const scope = usePatientScope();
  return useInfiniteQuery({
    queryKey: scopedKey(mealKeys.list({ history: true, ...filters }), scope),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      unwrap<Meal[]>(api.get(scopedApiPath(scope, '/meals'), { params: { ...filters, limit: HISTORY_PAGE, before: pageParam } })),
    getNextPageParam: (last) => (last.length === HISTORY_PAGE ? last[last.length - 1]!.eatenAt : undefined),
  });
}

export function useRecentMeals() {
  return useQuery({ queryKey: mealKeys.recent, queryFn: () => unwrap<RecentMeal[]>(api.get('/meals/recent')) });
}

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
      refreshSummaries(qc);
    },
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MealInput> }) => unwrap<Meal>(api.patch(`/meals/${id}`, input)),
    onSuccess: (m) => {
      qc.setQueryData(mealKeys.one(m.id), m);
      refreshSummaries(qc);
    },
  });
}

export type AnalysisStep = 'reading' | 'calculating' | 'scoring' | 'storing';

type AnalysisLine = { step: AnalysisStep } | { done: true; data: Meal } | { error: { code: string; message: string } };

export async function analyseWithProgress(id: string, onStep: (step: AnalysisStep) => void): Promise<Meal> {
  let meal: Meal | null = null;
  await streamLines<AnalysisLine>(`/meals/${id}/analyse`, (line) => {
    if ('step' in line) onStep(line.step);
    else if ('error' in line) throw new ApiError(line.error.message, 500, line.error.code);
    else meal = line.data;
  });
  if (!meal) throw new ApiError('The analysis didn’t finish. Please try again.', 500);
  return meal;
}

export function useAnalyseMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, onStep }: { id: string; onStep?: (step: AnalysisStep) => void }) => analyseWithProgress(id, onStep ?? (() => undefined)),
    onSuccess: (m) => {
      qc.setQueryData(mealKeys.one(m.id), m);
      refreshSummaries(qc);
    },
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/meals/${id}`),
    onSuccess: () => refreshSummaries(qc),
  });
}
