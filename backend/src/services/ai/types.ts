import type { NutrientKey } from '../nutrition/types.js';
import type { AnalysisOutput } from './schemas.js';

export type InputKey =
  | 'meal'
  | 'day'
  | `target.${NutrientKey}`
  | `lab.${string}`
  | 'ckdStage'
  | 'dialysisStatus'
  | 'restrictions'
  | 'allergies'
  | 'dietaryPreferences';

type PerNutrient<T> = Partial<Record<NutrientKey, T>>;

export interface AnalysisInput {
  meal: {
    category: string;
    eatenAtLocal: string;
    text: string;
    condiments: { name: string; amount: string }[];
    drinks: string[];
    cookingMethods: string[];
    items: {
      food: string;
      kind: 'food' | 'condiment' | 'drink';
      amount: string;
      grams: number | null;
      matchedTo: string | null;
      amountAssumed: boolean;
      nutrients: Record<NutrientKey, number | null>;
    }[];
    totals: Record<NutrientKey, { value: number | null; unit: 'mg' | 'g'; complete: boolean }>;
    dataNotes: string[];
  };
  day: {
    date: string;
    earlierMeals: number;
    totalsBeforeMeal: Record<NutrientKey, number>;
    totalsWithMeal: Record<NutrientKey, number>;
  };
  supplied: {
    targets?: PerNutrient<{ dailyMax: number; unit: string; source: string }>;
    labs?: Record<string, { label: string; value: number; unit: string; refLow: number | null; refHigh: number | null; collectedOn: string; source: string }>;
    ckdStage?: { value: string; source: string };
    dialysisStatus?: string;
    restrictions?: string[];
    allergies?: string[];
    dietaryPreferences?: string[];
  };
  allowedInputs: InputKey[];
}

export type ParsedFood = {
  name: string;
  localName: string | null;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  isMixedDish: boolean;
};

export interface AiProvider {
  name: 'gemini' | 'mock';
  model: string;
  parseMeal(text: string): Promise<ParsedFood[]>;
  analyseMeal(input: AnalysisInput): Promise<AnalysisOutput>;
}

export type AiErrorCode = 'not_configured' | 'timeout' | 'http' | 'blocked' | 'invalid_output' | 'rate_limited';

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}
