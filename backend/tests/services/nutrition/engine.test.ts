import { describe, expect, it } from 'vitest';
import { testCatalog } from '../../fixtures/food-catalog.js';
import { estimateMeal } from '../../../src/services/nutrition/engine.js';
import { matchFood } from '../../../src/services/nutrition/matcher.js';
import type { EngineResult, MealInput, NutrientKey } from '../../../src/services/nutrition/types.js';

const catalog = testCatalog();
const meal = (rawText: string, extra: Partial<MealInput> = {}): MealInput => ({
  rawText,
  condiments: [],
  drinks: [],
  cookingMethods: [],
  ...extra,
});

function expectTotals(r: EngineResult, expected: Record<NutrientKey, number | null>) {
  for (const [n, v] of Object.entries(expected) as [NutrientKey, number | null][]) {
    if (v == null) expect(r.totals[n].value, n).toBeNull();
    else expect(r.totals[n].value, n).toBeCloseTo(v, 1);
  }
}

const codes = (r: EngineResult) => r.notes.map((n) => n.code);

describe('matcher', () => {
  it('prefers the more specific record', () => {
    expect(matchFood('inihaw na manok', catalog)?.name).toBe('Inihaw na manok');
    expect(matchFood('manok', catalog)?.name).toBe('Manok');
  });

  it('matches English and Tagalog names to the same record', () => {
    expect(matchFood('white rice', catalog)?.foodId).toBe('kanin');
    expect(matchFood('kanin', catalog)?.foodId).toBe('kanin');
    expect(matchFood('grilled chicken', catalog)?.foodId).toBe('inihaw-manok');
  });

  it('returns nothing rather than a weak guess', () => {
    expect(matchFood('balut', catalog)).toBeNull();
    expect(matchFood('', catalog)).toBeNull();
  });
});

describe('recipes', () => {
  it('take their values from their ingredients', () => {
    const tm = catalog.byId.get('toyo-mansi')!;
    expect(tm.per100g.sodium).toBeCloseTo(3000);
    expect(tm.per100g.potassium).toBeCloseTo(160);
    expect(tm.per100g.phosphorus).toBeCloseTo(64);
    expect(tm.per100g.protein).toBeCloseTo(4.8);
  });
});

describe('estimateMeal: ten hand-calculated meals', () => {
  it('1. one cup of rice, all verified', () => {
    const r = estimateMeal(meal('1 tasa kanin'), catalog);
    expectTotals(r, { sodium: 3.2, potassium: 48, phosphorus: 64, protein: 4.8 });
    expect(r.totals.sodium).toMatchObject({ unit: 'mg', source: 'verified', complete: true });
    expect(r.totals.protein.unit).toBe('g');
    expect(r.notes).toEqual([]);
  });

  it('2. the design example: rice, grilled chicken thigh, half a cup of pinakbet', () => {
    const r = estimateMeal(meal('1 tasa kanin, isang hita ng inihaw na manok, kalahating tasa pinakbet'), catalog);
    expectTotals(r, { sodium: 703.2, potassium: 548, phosphorus: 304, protein: 31.8 });
    expect(r.totals.sodium.source).toBe('estimated');
    expect(r.items.map((i) => i.grams)).toEqual([160, 100, 100]);
    expect(codes(r)).toEqual(['unverified_food']);
  });

  it('3. breakfast with a count, an unknown amount and a drink', () => {
    const r = estimateMeal(meal('2 pandesal, scrambled egg', { drinks: ['kape'] }), catalog);
    expectTotals(r, { sodium: 374.8, potassium: 245, phosphorus: 157.2, protein: 12.1 });
    expect(r.items.find((i) => i.label === 'scrambled egg')).toMatchObject({ grams: 50, amountGuessed: true, unit: 'serving' });
    expect(r.totals.sodium.source).toBe('estimated');
    expect(codes(r)).toContain('amount_guessed');
  });

  it('4. sinigang (recipe) with rice, a teaspoon of patis and water', () => {
    const r = estimateMeal(
      meal('Sinigang na baboy, 1 tasa kanin', { condiments: [{ name: 'patis', amount: 'tsp' }], drinks: ['tubig'] }),
      catalog,
    );
    expectTotals(r, { sodium: 949.2, potassium: 351, phosphorus: 197.1, protein: 21 });
    expect(r.items.map((i) => i.kind)).toEqual(['food', 'food', 'condiment', 'drink']);
    expect(r.items[0]!.match?.source).toBe('recipe');
  });

  it('5. a little toyo-mansi, and a condiment missing from the tables', () => {
    const r = estimateMeal(
      meal('1 tasa kanin', {
        condiments: [
          { name: 'toyo_mansi', amount: 'konti' },
          { name: 'bagoong', amount: 'tsp' },
        ],
      }),
      catalog,
    );
    expectTotals(r, { sodium: 78.2, potassium: 52, phosphorus: 65.6, protein: 4.9 });
    expect(r.totals.sodium).toMatchObject({ complete: false, source: 'estimated' });
    expect(r.notes.find((n) => n.code === 'unmatched')?.items).toEqual(['bagoong']);
  });

  it('6. an unknown food is reported, never guessed', () => {
    const r = estimateMeal(meal('1 tasa kanin, 1 piraso balut'), catalog);
    expectTotals(r, { sodium: 3.2, potassium: 48, phosphorus: 64, protein: 4.8 });
    expect(r.items[1]).toMatchObject({ label: 'balut', match: null, grams: null });
    expect(r.items[1]!.nutrients.sodium).toEqual({ value: null, source: 'missing' });
    expect(r.totals.sodium.complete).toBe(false);
  });

  it('7. grams given directly', () => {
    const r = estimateMeal(meal('200g inihaw na manok'), catalog);
    expectTotals(r, { sodium: 800, potassium: 500, phosphorus: 400, protein: 50 });
    expect(r.totals.phosphorus.source).toBe('verified');
  });

  it('8. a unit the food has no weight for falls back to one serving, and says so', () => {
    const r = estimateMeal(meal('1 mangkok kanin'), catalog);
    expectTotals(r, { sodium: 3.2, potassium: 48, phosphorus: 64, protein: 4.8 });
    expect(r.items[0]).toMatchObject({ unit: 'mangkok', grams: 160, amountGuessed: true });
    expect(codes(r)).toEqual(expect.arrayContaining(['no_portion', 'amount_guessed']));
    expect(r.totals.sodium.source).toBe('estimated');
  });

  it('9. a nutrient the source does not report stays unknown, not zero', () => {
    const r = estimateMeal(meal('2 hiwa tinapay'), catalog);
    expectTotals(r, { sodium: 250, potassium: null, phosphorus: 50, protein: 4.5 });
    expect(r.totals.potassium).toMatchObject({ value: null, source: 'missing', complete: false });
    expect(r.notes.find((n) => n.code === 'no_value')).toMatchObject({ nutrient: 'potassium', items: ['tinapay'] });
  });

  it('10. milk typed by the cup and picked as a drink', () => {
    const r = estimateMeal(meal('isang tasang gatas', { drinks: ['gatas'] }), catalog);
    expectTotals(r, { sodium: 196, potassium: 735, phosphorus: 441, protein: 15.7 });
    expect(r.items.map((i) => i.grams)).toEqual([240, 250]);
  });
});

describe('estimateMeal: edges', () => {
  it('says so when there is nothing to count', () => {
    const r = estimateMeal(meal(''), catalog);
    expect(r.items).toEqual([]);
    expectTotals(r, { sodium: null, potassium: null, phosphorus: null, protein: null });
    expect(codes(r)).toEqual(['nothing_to_count']);
  });

  it('is deterministic', () => {
    const input = meal('1 tasa kanin, isang hita ng inihaw na manok', { condiments: [{ name: 'toyo', amount: 'tbsp' }] });
    expect(estimateMeal(input, catalog)).toEqual(estimateMeal(input, catalog));
  });

  it('records the engine version', () => {
    expect(estimateMeal(meal('kanin'), catalog).engineVersion).toMatch(/^nutrition-engine@\d+$/);
  });
});
