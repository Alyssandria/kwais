/**
 * Shapes shared by the nutrition engine.
 * The engine is pure: it takes the patient's meal input and a food catalog and returns numbers.
 * It never reads the database and never calls the AI, so its results can be reproduced by hand.
 */

export type NutrientKey = 'sodium' | 'potassium' | 'phosphorus' | 'protein';
export const NUTRIENT_KEYS: readonly NutrientKey[] = ['sodium', 'potassium', 'phosphorus', 'protein'];
export const NUTRIENT_UNITS: Record<NutrientKey, 'mg' | 'g'> = {
  sodium: 'mg',
  potassium: 'mg',
  phosphorus: 'mg',
  protein: 'g',
};

/**
 * Where a number came from.
 *   verified  a verified PhilFCT or USDA record, with an amount the patient gave
 *   estimated a recipe, an unverified record, or an amount K-WAIS had to assume
 *   missing   no matching food, no weight, or the source did not report the nutrient
 */
export type Provenance = 'verified' | 'estimated' | 'missing';

export type FoodSourceKind = 'PH_FCT' | 'USDA_FDC' | 'recipe' | 'custom';

/** One food as the engine sees it. Values are per 100 g edible portion; null = not reported. */
export interface CatalogFood {
  id: string;
  name: string;
  localNames: string[];
  category: string | null;
  source: FoodSourceKind;
  sourceRef: string;
  verified: boolean;
  per100g: Record<NutrientKey, number | null>;
  /** Household unit (canonical, see units.ts) → grams for one of that unit. */
  portions: Record<string, number>;
  /** Recipes only: ingredients in grams per 100 g of the cooked dish. */
  ingredients?: { foodId: string; gramsPer100g: number }[];
}

export interface Catalog {
  foods: CatalogFood[];
  byId: Map<string, CatalogFood>;
}

/** One food phrase read from the patient's text. */
export interface ParsedItem {
  label: string;
  quantity: number;
  /** Canonical unit, or null when the patient gave a count ("2 pandesal") or nothing. */
  unit: string | null;
  preparation: string | null;
  /** False when the patient gave no amount at all, so one serving is assumed. */
  quantityGiven: boolean;
}

export type CondimentAmount = 'konti' | 'tsp' | 'tbsp' | 'marami';

export interface MealInput {
  rawText: string;
  condiments: { name: string; amount: CondimentAmount }[];
  drinks: string[];
  cookingMethods: string[];
}

export interface FoodMatch {
  foodId: string;
  name: string;
  source: FoodSourceKind;
  sourceRef: string;
  verified: boolean;
  confidence: number;
}

export interface NutrientValue {
  value: number | null;
  source: Provenance;
}

export interface ItemResult {
  kind: 'food' | 'condiment' | 'drink';
  label: string;
  quantity: number;
  unit: string;
  grams: number | null;
  preparation: string | null;
  amountGuessed: boolean;
  match: FoodMatch | null;
  nutrients: Record<NutrientKey, NutrientValue>;
}

export interface NutrientTotal {
  value: number | null;
  unit: 'mg' | 'g';
  source: Provenance;
  /** False when at least one item could not be counted for this nutrient, so the total is a floor. */
  complete: boolean;
}

export type DataNoteCode = 'unmatched' | 'amount_guessed' | 'no_portion' | 'no_value' | 'unverified_food' | 'nothing_to_count';

export interface DataNote {
  code: DataNoteCode;
  message: string;
  items?: string[];
  nutrient?: NutrientKey;
}

export interface EngineResult {
  engineVersion: string;
  items: ItemResult[];
  totals: Record<NutrientKey, NutrientTotal>;
  notes: DataNote[];
}
