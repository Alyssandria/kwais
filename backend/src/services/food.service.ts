import { FoodModel, type FoodRow, type FoodSearchRow } from '../models/food.model.js';
import { buildCatalog } from './nutrition/catalog.js';
import type { Catalog, CatalogFood, NutrientKey } from './nutrition/types.js';

const CATALOG_TTL_MS = 5 * 60 * 1000;
let cached: { catalog: Catalog; at: number } | null = null;

const num = (d: { toString(): string } | null) => (d == null ? null : Number(d));

export function toCatalogFood(r: FoodRow): CatalogFood {
  return {
    id: r.id,
    name: r.name,
    localNames: r.localNames,
    category: r.category,
    source: r.source,
    sourceRef: r.sourceRef,
    verified: r.verified,
    per100g: { sodium: num(r.sodiumMg), potassium: num(r.potassiumMg), phosphorus: num(r.phosphorusMg), protein: num(r.proteinG) },
    portions: Object.fromEntries(r.portions.map((p) => [p.unit, Number(p.grams)])),
    ingredients: r.recipeComponents.length
      ? r.recipeComponents.map((c) => ({ foodId: c.ingredientId, gramsPer100g: Number(c.gramsPer100gDish) }))
      : undefined,
  };
}

export interface FoodView {
  id: string;
  name: string;
  localNames: string[];
  category: string | null;
  source: FoodSearchRow['source'];
  sourceRef: string;
  verified: boolean;
  per100g: Record<NutrientKey, number | null>;
  portions: { unit: string; grams: number }[];
}

export const FoodService = {
  async catalog(now = Date.now()): Promise<Catalog> {
    if (cached && now - cached.at < CATALOG_TTL_MS) return cached.catalog;
    const rows = await FoodModel.loadAll();
    const catalog = buildCatalog(rows.map(toCatalogFood));
    cached = { catalog, at: now };
    return catalog;
  },

  invalidate() {
    cached = null;
  },

  async search(q: string, limit = 20): Promise<FoodView[]> {
    const term = q.trim();
    if (term.length < 2) return [];
    const [rows, catalog] = await Promise.all([FoodModel.search(term, limit), FoodService.catalog()]);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      localNames: r.localNames,
      category: r.category,
      source: r.source,
      sourceRef: r.sourceRef,
      verified: r.verified,
      per100g: catalog.byId.get(r.id)?.per100g ?? {
        sodium: num(r.sodiumMg),
        potassium: num(r.potassiumMg),
        phosphorus: num(r.phosphorusMg),
        protein: num(r.proteinG),
      },
      portions: r.portions.map((p) => ({ unit: p.unit, grams: Number(p.grams) })),
    }));
  },
};
