import { describe, expect, it } from 'vitest';
import { testCatalog } from '../../../test/fixtures/food-catalog.js';
import { estimateMeal } from './engine.js';
import { matchFood } from './matcher.js';
import type { EngineResult, MealInput, NutrientKey } from './types.js';

/**
 * Ten sample meals with totals worked out by hand from the test catalog
 * (test/fixtures/food-catalog.ts). Each comment shows the arithmetic:
 * grams × value per 100 g ÷ 100, summed per nutrient.
 */

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
    // Toyo-mansi = 60 g toyo + 40 g calamansi per 100 g
    //   sodium 0.6 × 5000 = 3000; potassium 0.6 × 200 + 0.4 × 100 = 160
    //   phosphorus 0.6 × 100 + 0.4 × 10 = 64; protein 0.6 × 8 = 4.8
    const tm = catalog.byId.get('toyo-mansi')!;
    expect(tm.per100g.sodium).toBeCloseTo(3000);
    expect(tm.per100g.potassium).toBeCloseTo(160);
    expect(tm.per100g.phosphorus).toBeCloseTo(64);
    expect(tm.per100g.protein).toBeCloseTo(4.8);
  });
});

describe('estimateMeal: ten hand-calculated meals', () => {
  it('1. one cup of rice, all verified', () => {
    // kanin 1 tasa = 160 g: Na 2×1.6 = 3.2, K 30×1.6 = 48, P 40×1.6 = 64, protein 3×1.6 = 4.8
    const r = estimateMeal(meal('1 tasa kanin'), catalog);
    expectTotals(r, { sodium: 3.2, potassium: 48, phosphorus: 64, protein: 4.8 });
    expect(r.totals.sodium).toMatchObject({ unit: 'mg', source: 'verified', complete: true });
    expect(r.totals.protein.unit).toBe('g');
    expect(r.notes).toEqual([]);
  });

  it('2. the design example: rice, grilled chicken thigh, half a cup of pinakbet', () => {
    // kanin 160 g:              Na 3.2   K 48   P 64   protein 4.8
    // inihaw na manok 1 × 100 g: Na 400   K 250  P 200  protein 25
    // pinakbet 0.5 × 200 g:     Na 300   K 250  P 40   protein 2   (unverified sample record)
    const r = estimateMeal(meal('1 tasa kanin, isang hita ng inihaw na manok, kalahating tasa pinakbet'), catalog);
    expectTotals(r, { sodium: 703.2, potassium: 548, phosphorus: 304, protein: 31.8 });
    expect(r.totals.sodium.source).toBe('estimated');
    expect(r.items.map((i) => i.grams)).toEqual([160, 100, 100]);
    expect(codes(r)).toEqual(['unverified_food']);
  });

  it('3. breakfast with a count, an unknown amount and a drink', () => {
    // pandesal 2 × 30 g = 60 g:  Na 300   K 60    P 60    protein 5.4
    // scrambled egg, 1 serving 50 g (assumed): Na 70  K 65  P 90  protein 6.5
    // kape, 1 glass 240 g (assumed): Na 4.8  K 120  P 7.2  protein 0.24 → 0.2
    const r = estimateMeal(meal('2 pandesal, scrambled egg', { drinks: ['kape'] }), catalog);
    expectTotals(r, { sodium: 374.8, potassium: 245, phosphorus: 157.2, protein: 12.1 });
    expect(r.items.find((i) => i.label === 'scrambled egg')).toMatchObject({ grams: 50, amountGuessed: true, unit: 'serving' });
    expect(r.totals.sodium.source).toBe('estimated');
    expect(codes(r)).toContain('amount_guessed');
  });

  it('4. sinigang (recipe) with rice, a teaspoon of patis and water', () => {
    // Sinigang per 100 g = 20 g baboy + 10 g kangkong + 2 g patis + 68 g tubig
    //   Na 12 + 10 + 160 = 182; K 60 + 30 + 6 = 96; P 40 + 4 + 0.2 = 44.2; protein 5 + 0.2 + 0.1 = 5.3
    // sinigang, 1 serving 300 g (assumed): Na 546   K 288  P 132.6  protein 15.9
    // kanin 160 g:                          Na 3.2   K 48   P 64     protein 4.8
    // patis 1 tsp = 5 g:                    Na 400   K 15   P 0.5    protein 0.25 → 0.3
    // tubig 240 g:                          0
    const r = estimateMeal(
      meal('Sinigang na baboy, 1 tasa kanin', { condiments: [{ name: 'patis', amount: 'tsp' }], drinks: ['tubig'] }),
      catalog,
    );
    expectTotals(r, { sodium: 949.2, potassium: 351, phosphorus: 197.1, protein: 21 });
    expect(r.items.map((i) => i.kind)).toEqual(['food', 'food', 'condiment', 'drink']);
    expect(r.items[0]!.match?.source).toBe('recipe');
  });

  it('5. a little toyo-mansi, and a condiment missing from the tables', () => {
    // kanin 160 g:                 Na 3.2  K 48  P 64   protein 4.8
    // toyo-mansi konti 2.5 g:      Na 75   K 4   P 1.6  protein 0.12 → 0.1
    // bagoong: not in the tables → not counted
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
    // inihaw na manok 200 g: Na 800  K 500  P 400  protein 50
    const r = estimateMeal(meal('200g inihaw na manok'), catalog);
    expectTotals(r, { sodium: 800, potassium: 500, phosphorus: 400, protein: 50 });
    expect(r.totals.phosphorus.source).toBe('verified');
  });

  it('8. a unit the food has no weight for falls back to one serving, and says so', () => {
    // kanin has no "mangkok" weight → 1 serving = 160 g (assumed)
    const r = estimateMeal(meal('1 mangkok kanin'), catalog);
    expectTotals(r, { sodium: 3.2, potassium: 48, phosphorus: 64, protein: 4.8 });
    expect(r.items[0]).toMatchObject({ unit: 'mangkok', grams: 160, amountGuessed: true });
    expect(codes(r)).toEqual(expect.arrayContaining(['no_portion', 'amount_guessed']));
    expect(r.totals.sodium.source).toBe('estimated');
  });

  it('9. a nutrient the source does not report stays unknown, not zero', () => {
    // tinapay 2 hiwa × 25 g = 50 g: Na 250  K (not reported)  P 50  protein 4.5
    const r = estimateMeal(meal('2 hiwa tinapay'), catalog);
    expectTotals(r, { sodium: 250, potassium: null, phosphorus: 50, protein: 4.5 });
    expect(r.totals.potassium).toMatchObject({ value: null, source: 'missing', complete: false });
    expect(r.notes.find((n) => n.code === 'no_value')).toMatchObject({ nutrient: 'potassium', items: ['tinapay'] });
  });

  it('10. milk typed by the cup and picked as a drink', () => {
    // "isang tasang gatas": gatas has no tasa weight, but it is a drink → 240 g (assumed)
    //   Na 96  K 360  P 216  protein 7.68 → 7.7
    // Drinks chip gatas: 1 baso = 250 g (assumed): Na 100  K 375  P 225  protein 8
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
