export type NutrientKey = 'sodium' | 'potassium' | 'phosphorus' | 'protein';
export const NUTRIENT_KEYS: readonly NutrientKey[] = ['sodium', 'potassium', 'phosphorus', 'protein'];
export const NUTRIENT_UNITS: Record<NutrientKey, 'mg' | 'g'> = {
  sodium: 'mg',
  potassium: 'mg',
  phosphorus: 'mg',
  protein: 'g',
};

export type Provenance = 'verified' | 'estimated' | 'missing';

export type FoodSourceKind = 'PH_FCT' | 'USDA_FDC' | 'recipe' | 'custom';

export interface CatalogFood {
  id: string;
  name: string;
  localNames: string[];
  category: string | null;
  source: FoodSourceKind;
  sourceRef: string;
  verified: boolean;
  per100g: Record<NutrientKey, number | null>;
  portions: Record<string, number>;
  ingredients?: { foodId: string; gramsPer100g: number }[];
}

export interface Catalog {
  foods: CatalogFood[];
  byId: Map<string, CatalogFood>;
}

export interface ParsedItem {
  label: string;
  quantity: number;
  unit: string | null;
  preparation: string | null;
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
