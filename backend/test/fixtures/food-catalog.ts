import { buildCatalog } from '../../src/services/nutrition/catalog.js';
import type { CatalogFood, FoodSourceKind } from '../../src/services/nutrition/types.js';

/**
 * A small food catalog with round numbers, so engine results can be checked by hand.
 * These values are for tests only. They are not real food composition data.
 */

type Row = [na: number | null, k: number | null, p: number | null, protein: number | null];

function food(
  id: string,
  name: string,
  [sodium, potassium, phosphorus, protein]: Row,
  opts: {
    localNames?: string[];
    portions?: Record<string, number>;
    source?: FoodSourceKind;
    verified?: boolean;
    category?: string;
    ingredients?: { foodId: string; gramsPer100g: number }[];
  } = {},
): CatalogFood {
  return {
    id,
    name,
    localNames: opts.localNames ?? [],
    category: opts.category ?? null,
    source: opts.source ?? 'PH_FCT',
    sourceRef: `test:${id}`,
    verified: opts.verified ?? true,
    per100g: { sodium, potassium, phosphorus, protein },
    portions: opts.portions ?? {},
    ingredients: opts.ingredients,
  };
}

export function testCatalog() {
  return buildCatalog([
    food('kanin', 'Kanin', [2, 30, 40, 3], { localNames: ['rice', 'white rice'], portions: { tasa: 160, sandok: 80, serving: 160 } }),
    food('inihaw-manok', 'Inihaw na manok', [400, 250, 200, 25], { localNames: ['grilled chicken'], portions: { piraso: 100, serving: 100 } }),
    food('manok', 'Manok', [80, 250, 200, 27], { localNames: ['chicken'], portions: { piraso: 100, serving: 100 } }),
    food('pandesal', 'Pandesal', [500, 100, 100, 9], { portions: { piraso: 30 } }),
    food('itlog', 'Itlog', [140, 130, 180, 13], { localNames: ['egg'], source: 'USDA_FDC', portions: { piraso: 50, serving: 50 } }),
    food('tinapay', 'Tinapay', [500, null, 100, 9], { localNames: ['bread'], portions: { hiwa: 25 } }),
    food('baboy', 'Baboy', [60, 300, 200, 25], { localNames: ['pork'] }),
    food('kangkong', 'Kangkong', [100, 300, 40, 2]),
    food('tubig', 'Tubig', [0, 0, 0, 0], { localNames: ['water'], category: 'drink', portions: { baso: 240 } }),
    food('kape', 'Kape', [2, 50, 3, 0.1], { localNames: ['coffee'], category: 'drink', portions: { baso: 240 } }),
    food('gatas', 'Gatas', [40, 150, 90, 3.2], { localNames: ['milk'], category: 'drink', portions: { baso: 250 } }),
    food('toyo', 'Toyo', [5000, 200, 100, 8], { localNames: ['soy sauce'], category: 'condiment' }),
    food('calamansi', 'Calamansi juice', [0, 100, 10, 0], { category: 'fruit' }),
    food('patis', 'Patis', [8000, 300, 10, 5], { localNames: ['fish sauce'], category: 'condiment' }),
    food('pinakbet', 'Pinakbet', [300, 250, 40, 2], { source: 'custom', verified: false, portions: { tasa: 200, serving: 200 } }),
    food('toyo-mansi', 'Toyo-mansi', [null, null, null, null], {
      source: 'recipe',
      verified: false,
      category: 'condiment',
      ingredients: [
        { foodId: 'toyo', gramsPer100g: 60 },
        { foodId: 'calamansi', gramsPer100g: 40 },
      ],
    }),
    food('sinigang-baboy', 'Sinigang na baboy', [null, null, null, null], {
      source: 'recipe',
      verified: false,
      category: 'dish',
      portions: { mangkok: 300, serving: 300 },
      ingredients: [
        { foodId: 'baboy', gramsPer100g: 20 },
        { foodId: 'kangkong', gramsPer100g: 10 },
        { foodId: 'patis', gramsPer100g: 2 },
        { foodId: 'tubig', gramsPer100g: 68 },
      ],
    }),
  ]);
}
