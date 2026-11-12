import { guidanceWithout } from '../../src/services/ai/guidance.js';
import type { AnalysisInput } from '../../src/services/ai/types.js';

const totals = (sodium: number, potassium: number, phosphorus: number, protein: number, energy = 0, fluid = 0) => ({ sodium, potassium, phosphorus, protein, energy, fluid });

export function sampleInput(over: Partial<AnalysisInput['supplied']> = {}, withMeal: Partial<ReturnType<typeof totals>> = totals(900, 500, 300, 25)): AnalysisInput {
  const supplied: AnalysisInput['supplied'] = {
    targets: { sodium: { dailyMax: 2000, unit: 'mg', source: 'patient_entered' } },
    restrictions: ['Low-salt diet'],
    ...over,
  };
  const allowedInputs: AnalysisInput['allowedInputs'] = ['meal', 'day'];
  for (const n of Object.keys(supplied.targets ?? {})) allowedInputs.push(`target.${n}` as 'target.sodium');
  for (const k of ['restrictions', 'allergies'] as const) if (supplied[k]?.length) allowedInputs.push(k);
  const guidance = guidanceWithout(supplied.targets);
  for (const n of Object.keys(guidance)) allowedInputs.push(`guide.${n}` as 'guide.sodium');

  return {
    meal: {
      category: 'lunch',
      eatenAtLocal: '2026-10-16 12:30',
      text: '1 tasa kanin, inihaw na manok',
      condiments: [{ name: 'toyo', amount: 'tsp' }],
      drinks: [],
      cookingMethods: [],
      items: [],
      totals: {
        sodium: { value: 400, unit: 'mg', complete: true },
        potassium: { value: 300, unit: 'mg', complete: true },
        phosphorus: { value: 250, unit: 'mg', complete: true },
        protein: { value: 25, unit: 'g', complete: true },
        energy: { value: 450, unit: 'kcal', complete: true },
        fluid: { value: 0, unit: 'mL', complete: true },
      },
      dataNotes: [],
    },
    day: { date: '2026-10-16', earlierMeals: 1, totalsBeforeMeal: totals(500, 200, 50, 0), totalsWithMeal: { ...totals(0, 0, 0, 0), ...withMeal } },
    supplied,
    guidance,
    allowedInputs,
  };
}
