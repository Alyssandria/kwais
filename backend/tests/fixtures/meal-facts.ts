import type { MealFacts } from '../../src/services/meal-summary.js';
import type { NutrientTotal } from '../../src/services/nutrition/types.js';

const total = (value: number, unit: 'mg' | 'g', source: NutrientTotal['source'] = 'estimated'): NutrientTotal => ({ value, unit, source, complete: true });

export function facts(over: Partial<MealFacts> & { at: string; sodium?: number; analysed?: boolean }): MealFacts {
  const { at, sodium = 500, analysed = true, ...rest } = over;
  return {
    id: `meal-${at}`,
    date: '',
    eatenAt: new Date(at),
    category: 'lunch',
    rawText: '1 tasa kanin',
    status: analysed ? 'analysed' : 'saved',
    totals: analysed
      ? { sodium: total(sodium, 'mg'), potassium: total(300, 'mg'), phosphorus: total(200, 'mg', 'verified'), protein: total(20, 'g', 'verified') }
      : null,
    score: null,
    aiStatus: analysed ? 'unavailable' : null,
    ai: null,
    ...rest,
  };
}
