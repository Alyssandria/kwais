import { matchFood } from './matcher.js';
import { parseMealText } from './text-parser.js';
import {
  NUTRIENT_KEYS,
  NUTRIENT_UNITS,
  type Catalog,
  type CatalogFood,
  type CondimentAmount,
  type DataNote,
  type EngineResult,
  type FoodMatch,
  type ItemResult,
  type MealInput,
  type NutrientKey,
  type NutrientTotal,
  type NutrientValue,
  type ParsedItem,
} from './types.js';
import { DRINK_GLASS_GRAMS, STANDARD_GRAMS } from './units.js';

/**
 * The nutrition engine: meal input + food catalog → per-item and total sodium, potassium,
 * phosphorus (mg) and protein (g), each tagged with where the number came from.
 *
 * Every number here is arithmetic on dataset values: grams × value per 100 g ÷ 100.
 * The AI never produces a nutrient number. Bump ENGINE_VERSION whenever a rule below changes,
 * so stored analyses can be traced to the rules that produced them.
 */
export const ENGINE_VERSION = 'nutrition-engine@1';

/**
 * Condiment amounts in grams. Spoons are standard measures; "konti" (a little) and
 * "marami" (a lot) are assumptions, so those amounts are marked as guessed.
 */
export const CONDIMENT_GRAMS: Record<CondimentAmount, { grams: number; guessed: boolean; label: string }> = {
  konti: { grams: 2.5, guessed: true, label: 'konti (about ½ tsp)' },
  tsp: { grams: 5, guessed: false, label: '1 tsp' },
  tbsp: { grams: 15, guessed: false, label: '1 tbsp' },
  marami: { grams: 30, guessed: true, label: 'marami (about 2 tbsp)' },
};

/**
 * What each condiment and drink chip means, as a phrase for the matcher.
 * Matching by name (not by a fixed record id) keeps working when the sample data is replaced
 * with real PhilFCT or USDA records that carry the same names.
 */
export const CONDIMENT_FOODS: Record<string, string> = {
  toyo: 'toyo',
  toyo_mansi: 'toyo mansi',
  patis: 'patis',
  bagoong: 'bagoong',
  suka: 'suka',
  asin: 'asin',
  ketchup: 'tomato ketchup',
  banana_ketchup: 'banana ketchup',
  sarsa: 'lechon sauce',
  mayonnaise: 'mayonnaise',
  sili: 'chili sauce',
  oyster_sauce: 'oyster sauce',
};

export const DRINK_FOODS: Record<string, string> = {
  tubig: 'tubig',
  kape: 'kape',
  tsaa: 'tsaa',
  softdrinks: 'softdrinks',
  juice: 'orange juice',
  gatas: 'gatas',
  buko_juice: 'buko juice',
  milk_tea: 'milk tea',
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const emptyNutrients = (): Record<NutrientKey, NutrientValue> =>
  Object.fromEntries(NUTRIENT_KEYS.map((n) => [n, { value: null, source: 'missing' }])) as Record<NutrientKey, NutrientValue>;

/** Grams for a parsed amount, from the food's own portions first. */
function gramsFor(
  food: CatalogFood,
  item: ParsedItem,
): { grams: number | null; unit: string; guessed: boolean; noPortion: boolean } {
  const q = item.quantity;
  const isDrink = food.category === 'drink';

  if (!item.quantityGiven) {
    const serving = food.portions.serving;
    return serving != null
      ? { grams: serving, unit: 'serving', guessed: true, noPortion: false }
      : { grams: null, unit: 'serving', guessed: true, noPortion: true };
  }

  // A count with no unit ("2 pandesal") means pieces.
  const unit = item.unit ?? 'piraso';
  const own = food.portions[unit];
  if (own != null) return { grams: q * own, unit, guessed: false, noPortion: false };
  if (STANDARD_GRAMS[unit] != null) return { grams: q * STANDARD_GRAMS[unit]!, unit, guessed: false, noPortion: false };
  if (isDrink && (unit === 'baso' || unit === 'tasa')) return { grams: q * DRINK_GLASS_GRAMS, unit, guessed: true, noPortion: false };

  // We know the food but not how much one of that unit weighs: fall back to servings, and say so.
  const serving = food.portions.serving;
  return serving != null
    ? { grams: q * serving, unit, guessed: true, noPortion: true }
    : { grams: null, unit, guessed: true, noPortion: true };
}

function nutrientsFor(food: CatalogFood, grams: number, guessed: boolean): Record<NutrientKey, NutrientValue> {
  const fromVerifiedTable = food.verified && (food.source === 'PH_FCT' || food.source === 'USDA_FDC');
  const out = emptyNutrients();
  for (const n of NUTRIENT_KEYS) {
    const per100 = food.per100g[n];
    if (per100 == null) continue;
    out[n] = { value: round1((per100 * grams) / 100), source: fromVerifiedTable && !guessed ? 'verified' : 'estimated' };
  }
  return out;
}

function toMatch(food: CatalogFood, confidence: number): FoodMatch {
  return { foodId: food.id, name: food.name, source: food.source, sourceRef: food.sourceRef, verified: food.verified, confidence };
}

/** Runs the whole meal. Pure: same input and catalog, same result. */
export function estimateMeal(input: MealInput, catalog: Catalog): EngineResult {
  const items: ItemResult[] = [];
  const unmatched: string[] = [];
  const guessed: string[] = [];
  const noPortion: string[] = [];
  const unverified = new Set<string>();

  // 1. Foods typed by the patient.
  for (const p of parseMealText(input.rawText)) {
    const match = matchFood(p.label, catalog);
    const food = match ? catalog.byId.get(match.foodId) : undefined;
    if (!match || !food) {
      unmatched.push(p.label);
      items.push({
        kind: 'food',
        label: p.label,
        quantity: p.quantity,
        unit: p.unit ?? (p.quantityGiven ? 'piraso' : 'serving'),
        grams: null,
        preparation: p.preparation,
        amountGuessed: !p.quantityGiven,
        match: null,
        nutrients: emptyNutrients(),
      });
      continue;
    }
    const g = gramsFor(food, p);
    if (g.guessed) guessed.push(p.label);
    if (g.noPortion) noPortion.push(p.label);
    if (!food.verified) unverified.add(food.name);
    items.push({
      kind: 'food',
      label: p.label,
      quantity: p.quantity,
      unit: g.unit,
      grams: g.grams == null ? null : round1(g.grams),
      preparation: p.preparation,
      amountGuessed: g.guessed,
      match,
      nutrients: g.grams == null ? emptyNutrients() : nutrientsFor(food, g.grams, g.guessed),
    });
  }

  // 2. Condiments, at the amount the patient picked.
  for (const c of input.condiments) {
    const phrase = CONDIMENT_FOODS[c.name] ?? c.name.replace(/_/g, ' ');
    const match = matchFood(phrase, catalog);
    const food = match ? catalog.byId.get(match.foodId) : undefined;
    const amt = CONDIMENT_GRAMS[c.amount];
    if (!match || !food) {
      unmatched.push(phrase);
      items.push({ kind: 'condiment', label: phrase, quantity: 1, unit: c.amount, grams: amt.grams, preparation: null, amountGuessed: amt.guessed, match: null, nutrients: emptyNutrients() });
      continue;
    }
    if (amt.guessed) guessed.push(`${phrase} (${c.amount})`);
    if (!food.verified) unverified.add(food.name);
    items.push({
      kind: 'condiment',
      label: phrase,
      quantity: 1,
      unit: c.amount,
      grams: amt.grams,
      preparation: null,
      amountGuessed: amt.guessed,
      match: toMatch(food, match.confidence),
      nutrients: nutrientsFor(food, amt.grams, amt.guessed),
    });
  }

  // 3. Drinks: one glass each. The form does not ask for size, so the amount is always an assumption.
  for (const d of input.drinks) {
    const phrase = DRINK_FOODS[d] ?? d.replace(/_/g, ' ');
    const match = matchFood(phrase, catalog);
    const food = match ? catalog.byId.get(match.foodId) : undefined;
    if (!match || !food) {
      unmatched.push(phrase);
      items.push({ kind: 'drink', label: phrase, quantity: 1, unit: 'baso', grams: null, preparation: null, amountGuessed: true, match: null, nutrients: emptyNutrients() });
      continue;
    }
    const grams = food.portions.baso ?? food.portions.serving ?? DRINK_GLASS_GRAMS;
    guessed.push(phrase);
    if (!food.verified) unverified.add(food.name);
    items.push({
      kind: 'drink',
      label: phrase,
      quantity: 1,
      unit: 'baso',
      grams: round1(grams),
      preparation: null,
      amountGuessed: true,
      match: toMatch(food, match.confidence),
      nutrients: nutrientsFor(food, grams, true),
    });
  }

  // 4. Totals. A total is "complete" only when every item could be counted for that nutrient.
  const totals = {} as Record<NutrientKey, NutrientTotal>;
  const notes: DataNote[] = [];
  for (const n of NUTRIENT_KEYS) {
    const values = items.map((i) => i.nutrients[n]);
    const known = values.filter((v) => v.value != null);
    const complete = items.length > 0 && known.length === items.length;
    const value = known.length ? round1(known.reduce((s, v) => s + v.value!, 0)) : null;
    const source = value == null ? 'missing' : complete && known.every((v) => v.source === 'verified') ? 'verified' : 'estimated';
    totals[n] = { value, unit: NUTRIENT_UNITS[n], source, complete };

    const noValue = items.filter((i) => i.match && i.grams != null && i.nutrients[n].value == null).map((i) => i.label);
    if (noValue.length) {
      notes.push({ code: 'no_value', nutrient: n, items: noValue, message: `The food tables have no ${n} value for: ${noValue.join(', ')}. The ${n} total leaves them out.` });
    }
  }

  if (items.length === 0) {
    notes.push({ code: 'nothing_to_count', message: 'We could not find any foods in this meal to count.' });
  }
  if (unmatched.length) {
    notes.push({ code: 'unmatched', items: unmatched, message: `Not counted, because we could not find these in the food tables: ${unmatched.join(', ')}.` });
  }
  if (noPortion.length) {
    notes.push({ code: 'no_portion', items: noPortion, message: `We do not know the weight of that unit for: ${noPortion.join(', ')}, so one serving each was used.` });
  }
  if (guessed.length) {
    notes.push({ code: 'amount_guessed', items: guessed, message: `Amounts assumed for: ${guessed.join(', ')}. Add amounts like tasa or piraso for a closer estimate.` });
  }
  if (unverified.size) {
    notes.push({ code: 'unverified_food', items: [...unverified], message: `These food values are approximate and not yet checked against PhilFCT or USDA: ${[...unverified].join(', ')}.` });
  }

  return { engineVersion: ENGINE_VERSION, items, totals, notes };
}
