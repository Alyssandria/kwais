import { NUTRIENT_KEYS, type Catalog, type CatalogFood, type NutrientKey } from './types.js';

/**
 * Builds the in-memory catalog the engine reads, and works out per-100 g values for recipes
 * from their ingredients. A recipe's own stored values are ignored: its numbers always come
 * from the ingredient records, so correcting an ingredient corrects every dish that uses it.
 */
export function buildCatalog(foods: CatalogFood[]): Catalog {
  const byId = new Map(foods.map((f) => [f.id, { ...f, per100g: { ...f.per100g } }]));
  const resolved = new Set<string>();

  const resolve = (food: CatalogFood, trail: Set<string>): CatalogFood => {
    if (food.source !== 'recipe' || !food.ingredients?.length || resolved.has(food.id)) return food;
    if (trail.has(food.id)) throw new Error(`Recipe ${food.name} contains itself`);
    trail.add(food.id);

    const per100g = {} as Record<NutrientKey, number | null>;
    for (const n of NUTRIENT_KEYS) per100g[n] = 0;
    for (const ing of food.ingredients) {
      const part = byId.get(ing.foodId);
      if (!part) throw new Error(`Recipe ${food.name} uses an unknown ingredient ${ing.foodId}`);
      const p = resolve(part, trail);
      for (const n of NUTRIENT_KEYS) {
        const v = p.per100g[n];
        // An ingredient without a value makes the dish's value unknown, not lower.
        per100g[n] = v == null || per100g[n] == null ? null : per100g[n]! + (v * ing.gramsPer100g) / 100;
      }
    }
    food.per100g = per100g;
    resolved.add(food.id);
    trail.delete(food.id);
    return food;
  };

  for (const f of byId.values()) resolve(f, new Set());
  const list = [...byId.values()];
  return { foods: list, byId };
}
