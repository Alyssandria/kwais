import { describe, expect, it } from 'vitest';
import { buildAnalysisInput, type InputSources } from '../../../src/services/ai/inputs.js';
import { toParsedItem } from '../../../src/services/ai/ai.service.js';
import { estimateMeal } from '../../../src/services/nutrition/engine.js';
import { testCatalog } from '../../fixtures/food-catalog.js';

const meal = { rawText: '1 tasa kanin', condiments: [{ name: 'patis', amount: 'tsp' as const }], drinks: [], cookingMethods: [] };

function sources(over: Partial<InputSources> = {}): InputSources {
  return {
    meal: { ...meal, category: 'lunch', eatenAtLocal: '2026-10-16 12:30' },
    engine: estimateMeal(meal, testCatalog()),
    day: { date: '2026-10-16', earlierMeals: 1, totalsBeforeMeal: { sodium: 1000, potassium: 0, phosphorus: 0, protein: 0 } },
    profile: { ckdStage: null, dialysisStatus: 'unknown', restrictions: [], allergies: [], dietaryPreferences: [] },
    targets: [],
    labs: [],
    ...over,
  };
}

const lab = (id: string, test: 'potassium' | 'other', collectedOn: string, value: number, label = 'Potassium') => ({
  id,
  test,
  label,
  value,
  refLow: 3.5,
  refHigh: 5.1,
  unit: 'mmol/L',
  collectedOn,
  labName: 'Private lab name',
  source: 'patient_entered' as const,
  createdAt: '',
});

describe('buildAnalysisInput', () => {
  it('sends only the meal and day when the patient supplied nothing else', () => {
    const input = buildAnalysisInput(sources());
    expect(input.supplied).toEqual({});
    expect(input.allowedInputs).toEqual(['meal', 'day']);
    // kanin 3.2 + patis 400 + 1000 earlier
    expect(input.day.totalsWithMeal.sodium).toBe(1403.2);
  });

  it('keeps the newest lab per test, without the lab name', () => {
    const input = buildAnalysisInput(
      sources({ labs: [lab('a', 'potassium', '2026-06-20', 5.0), lab('b', 'potassium', '2026-09-28', 5.6), lab('c', 'other', '2026-09-28', 7, 'Uric acid panel')] }),
    );
    expect(input.supplied.labs?.potassium).toMatchObject({ value: 5.6, collectedOn: '2026-09-28' });
    expect(JSON.stringify(input)).not.toContain('Private lab name');
    expect(input.allowedInputs).toEqual(['meal', 'day', 'lab.potassium', 'lab.other:uric acid panel']);
  });

  it('includes profile details only when given', () => {
    const input = buildAnalysisInput(
      sources({
        profile: { ckdStage: { value: '3b', source: 'clinician_verified' }, dialysisStatus: 'none', restrictions: ['Low-salt diet'], allergies: [], dietaryPreferences: [] },
        targets: [{ nutrient: 'sodium', dailyMax: 2000, unit: 'mg', source: 'patient_entered', note: 'private note', since: '' }],
      }),
    );
    expect(input.supplied).toEqual({
      targets: { sodium: { dailyMax: 2000, unit: 'mg', source: 'patient_entered' } },
      ckdStage: { value: '3b', source: 'clinician_verified' },
      dialysisStatus: 'none',
      restrictions: ['Low-salt diet'],
    });
    expect(input.allowedInputs).toEqual(['meal', 'day', 'target.sodium', 'ckdStage', 'dialysisStatus', 'restrictions']);
  });
});

describe('toParsedItem', () => {
  it('matches on the local name first and the English name as a fallback', () => {
    expect(toParsedItem({ name: 'Grilled chicken', localName: 'Inihaw na manok', quantity: null, unit: 'piraso', preparation: 'grilled', isMixedDish: false })).toEqual({
      label: 'inihaw na manok',
      altLabels: ['grilled chicken'],
      quantity: 1,
      unit: 'piraso',
      preparation: 'grilled',
      quantityGiven: true,
    });
  });

  it('treats no amount and no unit as one assumed serving', () => {
    expect(toParsedItem({ name: 'Sinigang', localName: null, quantity: null, unit: null, preparation: null, isMixedDish: true })).toMatchObject({
      quantity: 1,
      quantityGiven: false,
      altLabels: [],
    });
  });
});
