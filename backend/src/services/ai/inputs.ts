import type { LabView } from '../lab.service.js';
import type { ProfileView } from '../profile.service.js';
import type { TargetView } from '../target.service.js';
import { NUTRIENT_KEYS, type EngineResult, type MealInput, type NutrientKey } from '../nutrition/types.js';
import { guidanceWithout } from './guidance.js';
import type { AnalysisInput, InputKey } from './types.js';

export interface InputSources {
  meal: MealInput & { category: string; eatenAtLocal: string };
  engine: EngineResult;
  day: { date: string; earlierMeals: number; totalsBeforeMeal: Record<NutrientKey, number> };
  profile: Pick<ProfileView, 'ckdStage' | 'dialysisStatus' | 'restrictions' | 'allergies' | 'dietaryPreferences'>;
  targets: TargetView[];
  labs: LabView[];
}

const amountOf = (quantity: number, unit: string) => `${Math.round(quantity * 100) / 100} ${unit}`;

// supplied details only: no name, patient code or contact details
export function buildAnalysisInput(src: InputSources): AnalysisInput {
  const allowed: InputKey[] = ['meal', 'day'];
  const supplied: AnalysisInput['supplied'] = {};

  if (src.targets.length) {
    supplied.targets = {};
    for (const t of src.targets) {
      supplied.targets[t.nutrient] = { dailyMax: t.dailyMax, unit: t.unit, source: t.source };
      allowed.push(`target.${t.nutrient}`);
    }
  }

  const latest = new Map<string, LabView>();
  for (const l of src.labs) {
    const key = l.test === 'other' ? `other:${l.label.toLowerCase()}` : l.test;
    const prev = latest.get(key);
    if (!prev || l.collectedOn > prev.collectedOn) latest.set(key, l);
  }
  if (latest.size) {
    supplied.labs = {};
    for (const [key, l] of latest) {
      supplied.labs[key] = { label: l.label, value: l.value, unit: l.unit, refLow: l.refLow, refHigh: l.refHigh, collectedOn: l.collectedOn, source: l.source };
      allowed.push(`lab.${key}`);
    }
  }

  const p = src.profile;
  if (p.ckdStage) {
    supplied.ckdStage = { value: p.ckdStage.value, source: p.ckdStage.source };
    allowed.push('ckdStage');
  }
  if (p.dialysisStatus !== 'unknown') {
    supplied.dialysisStatus = p.dialysisStatus;
    allowed.push('dialysisStatus');
  }
  for (const key of ['restrictions', 'allergies', 'dietaryPreferences'] as const) {
    if (p[key].length) {
      supplied[key] = p[key];
      allowed.push(key);
    }
  }

  const guidance = guidanceWithout(supplied.targets);
  for (const n of Object.keys(guidance) as NutrientKey[]) allowed.push(`guide.${n}`);

  const totalsWithMeal = {} as Record<NutrientKey, number>;
  for (const n of NUTRIENT_KEYS) totalsWithMeal[n] = Math.round((src.day.totalsBeforeMeal[n] + (src.engine.totals[n].value ?? 0)) * 10) / 10;

  return {
    meal: {
      category: src.meal.category,
      eatenAtLocal: src.meal.eatenAtLocal,
      text: src.meal.rawText,
      condiments: src.meal.condiments,
      drinks: src.meal.drinks,
      cookingMethods: src.meal.cookingMethods,
      items: src.engine.items.map((i) => ({
        food: i.label,
        kind: i.kind,
        amount: amountOf(i.quantity, i.unit),
        grams: i.grams,
        matchedTo: i.match?.name ?? null,
        amountAssumed: i.amountGuessed,
        nutrients: Object.fromEntries(NUTRIENT_KEYS.map((n) => [n, i.nutrients[n].value])) as Record<NutrientKey, number | null>,
      })),
      totals: Object.fromEntries(
        NUTRIENT_KEYS.map((n) => [n, { value: src.engine.totals[n].value, unit: src.engine.totals[n].unit, complete: src.engine.totals[n].complete }]),
      ) as AnalysisInput['meal']['totals'],
      dataNotes: src.engine.notes.map((n) => n.message),
    },
    day: { ...src.day, totalsWithMeal },
    supplied,
    guidance,
    allowedInputs: allowed,
  };
}
