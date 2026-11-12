// Values a food composition table gives per 100 g.
export type FoodNutrientKey = 'sodium' | 'potassium' | 'phosphorus' | 'protein' | 'energy';
export const FOOD_NUTRIENT_KEYS: readonly FoodNutrientKey[] = ['sodium', 'potassium', 'phosphorus', 'protein', 'energy'];

// Everything K-WAIS totals for a meal or a day. Fluid comes from logged drinks, not from food tables.
export type NutrientKey = FoodNutrientKey | 'fluid';
export const NUTRIENT_KEYS: readonly NutrientKey[] = ['sodium', 'potassium', 'phosphorus', 'protein', 'energy', 'fluid'];
export type NutrientUnit = 'mg' | 'g' | 'kcal' | 'mL';
export const NUTRIENT_UNITS: Record<NutrientKey, NutrientUnit> = {
  sodium: 'mg',
  potassium: 'mg',
  phosphorus: 'mg',
  protein: 'g',
  energy: 'kcal',
  fluid: 'mL',
};

// Energy is shown, never scored: in CKD a calorie target is a goal to reach, not a limit.
export const SCORED_KEYS: readonly NutrientKey[] = ['sodium', 'potassium', 'phosphorus', 'protein', 'fluid'];

export type DrinkUnit = 'baso' | 'tasa' | 'lata' | 'ml';
export const DRINK_UNIT_ML: Record<DrinkUnit, number> = { baso: 240, tasa: 240, lata: 330, ml: 1 };

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
  per100g: Record<FoodNutrientKey, number | null>;
  portions: Record<string, number>;
  ingredients?: { foodId: string; gramsPer100g: number }[];
}

export interface Catalog {
  foods: CatalogFood[];
  byId: Map<string, CatalogFood>;
}

export interface ParsedItem {
  label: string;
  altLabels?: string[];
  quantity: number;
  unit: string | null;
  preparation: string | null;
  quantityGiven: boolean;
}

export type CondimentAmount = 'konti' | 'tsp' | 'tbsp' | 'marami';

export interface MealDrinkInput {
  name: string;
  quantity: number;
  unit: DrinkUnit;
  assumed: boolean;
}

export interface MealInput {
  rawText: string;
  condiments: { name: string; amount: CondimentAmount }[];
  drinks: MealDrinkInput[];
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
  unit: NutrientUnit;
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
