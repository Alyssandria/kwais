import { describe, expect, it } from 'vitest';
import { mockAnalysis } from '../../../src/services/ai/mock.provider.js';
import { bandFor, capDeductions, checkAnalysis, scoreBasis } from '../../../src/services/ai/rubric.js';
import type { AnalysisOutput } from '../../../src/services/ai/schemas.js';
import { sampleInput } from '../../fixtures/analysis-input.js';

const output = (over: Partial<AnalysisOutput> = {}): AnalysisOutput => ({
  score: 10,
  scoreReasons: [
    { title: 'Sodium over target', detail: '…', deduction: 2, basis: 'target' },
    { title: 'Restriction', detail: '…', deduction: 2, basis: 'restriction' },
    { title: 'Phosphorus not scored', detail: '…', deduction: null, basis: 'not_scored' },
  ],
  summary: '…',
  actions: [],
  observations: [],
  concerns: [],
  clinicianQuestions: [],
  dataQuality: '…',
  usedInputs: ['meal', 'target.sodium', 'restrictions'],
  ...over,
});

describe('checkAnalysis', () => {
  it('sets the score to 10 minus the listed deductions, whatever the model said', () => {
    expect(checkAnalysis(output({ score: 9 }), sampleInput()).score).toBe(6);
  });

  it('never goes below 1', () => {
    const many = output({ scoreReasons: Array.from({ length: 4 }, () => ({ title: 't', detail: 'd', deduction: 3, basis: 'target' as const })) });
    expect(checkAnalysis(many, sampleInput()).score).toBe(1);
  });

  it('marks a score from the patient’s own targets as personal', () => {
    expect(checkAnalysis(output(), sampleInput()).scoreBasis).toBe('personal');
  });

  it('still scores against general guidance when no targets or labs were supplied', () => {
    const input = sampleInput({ targets: undefined, labs: undefined });
    const out = checkAnalysis(output({ usedInputs: ['meal', 'guide.sodium', 'restrictions'] }), input);
    expect(out.score).toBe(6);
    expect(out.scoreBasis).toBe('general');
  });

  it('removes the score only when even the sodium number is missing', () => {
    const input = sampleInput({ targets: undefined, labs: undefined });
    input.meal.totals.sodium.value = null;
    const out = checkAnalysis(output({ usedInputs: ['meal', 'restrictions'] }), input);
    expect(out.score).toBeNull();
    expect(out.scoreBasis).toBeNull();
    expect(out.scoreReasons.every((r) => r.deduction === null)).toBe(true);
  });

  it('rejects an analysis that cites something the patient did not supply', () => {
    expect(() => checkAnalysis(output({ usedInputs: ['meal', 'ckdStage'] }), sampleInput())).toThrow(/ckdStage/);
  });
});

describe('limits on judgement deductions', () => {
  const reason = (basis: AnalysisOutput['scoreReasons'][number]['basis'], deduction: number | null) => ({ title: 't', detail: 'd', basis, deduction });

  it('allows at most 2 per description reason and 3 in total', () => {
    const capped = capDeductions([reason('description', 3), reason('description', 2), reason('target', 2)]);
    expect(capped.map((r) => r.deduction)).toEqual([2, 1, 2]);
  });

  it('allows 1 for a meal that takes a big share of the day, and nothing for unscored items', () => {
    expect(capDeductions([reason('meal_share', 2), reason('not_scored', 2)]).map((r) => r.deduction)).toEqual([1, null]);
  });

  it('applies the limits before computing the score', () => {
    const out = checkAnalysis(output({ scoreReasons: [reason('description', 2), reason('description', 2), reason('description', 2)] }), sampleInput());
    expect(out.score).toBe(7);
  });
});

describe('scoreBasis and bands', () => {
  it('is personal with a target or a sodium, potassium or phosphorus lab with a range, else general', () => {
    expect(scoreBasis(sampleInput())).toBe('personal');
    expect(scoreBasis(sampleInput({ targets: undefined }))).toBe('personal');
    const noRange = { potassium: { label: 'Potassium', value: 5.6, unit: 'mmol/L', refLow: null, refHigh: null, collectedOn: '2026-09-28', source: 'patient_entered' } };
    expect(scoreBasis(sampleInput({ targets: undefined, labs: noRange }))).toBe('general');
  });

  it.each([
    [10, 'good'],
    [8, 'good'],
    [7, 'mixed'],
    [5, 'mixed'],
    [4, 'attention'],
    [null, null],
  ] as const)('%s → %s', (score, band) => {
    expect(bandFor(score)).toBe(band);
  });
});

describe('mock analysis (offline stand-in for Gemini)', () => {
  it('follows the rubric: over target, high lab, salty condiment with a low-salt diet', () => {
    const input = sampleInput(
      { targets: { sodium: { dailyMax: 2000, unit: 'mg', source: 'patient_entered' }, potassium: { dailyMax: 2000, unit: 'mg', source: 'patient_entered' } } },
      { sodium: 2100, potassium: 2100, phosphorus: 300, protein: 25 },
    );
    input.allowedInputs.push('target.potassium');
    const out = checkAnalysis(mockAnalysis(input), input);
    // sodium over −2, potassium over with high lab −3, toyo with low-salt diet −2
    expect(out.score).toBe(3);
    expect(out.scoreReasons.map((r) => r.deduction)).toEqual([2, 3, null, null, 2]);
    expect(out.usedInputs).toEqual(expect.arrayContaining(['target.sodium', 'target.potassium', 'lab.potassium', 'restrictions']));
  });

  it('scores against general sodium guidance and suggests adding targets when nothing was supplied', () => {
    const input = sampleInput({ targets: undefined, labs: undefined, restrictions: undefined }, { sodium: 2300, potassium: 500, phosphorus: 300, protein: 25 });
    const out = checkAnalysis(mockAnalysis(input), input);
    expect(out.score).toBe(8);
    expect(out.scoreBasis).toBe('general');
    expect(out.scoreReasons[0]).toMatchObject({ title: 'Sodium is over general guidance', deduction: 2 });
    expect(out.usedInputs).toContain('guide.sodium');
    expect(out.actions.map((a) => a.title)).toEqual(['Keep the rest of today low in sodium', 'Swap the sawsawan', 'Add your own targets']);
  });

  it('gives no score and says so when the meal has no sodium value', () => {
    const input = sampleInput({ targets: undefined, labs: undefined, restrictions: undefined });
    input.meal.totals.sodium.value = null;
    const out = checkAnalysis(mockAnalysis(input), input);
    expect(out.score).toBeNull();
    expect(out.scoreReasons[0]!.title).toBe('No score yet');
  });

  it('takes points off for a salty description and a meal that is a big share of the day', () => {
    const input = sampleInput({ targets: undefined, labs: undefined, restrictions: undefined });
    input.meal.text = 'maalat na sinigang na baboy';
    input.meal.condiments = [];
    input.meal.totals.sodium.value = 900;
    const out = checkAnalysis(mockAnalysis(input), input);
    expect(out.scoreReasons.filter((r) => r.deduction).map((r) => [r.basis, r.deduction])).toEqual([
      ['meal_share', 1],
      ['description', 1],
    ]);
    expect(out.score).toBe(8);
    expect(out.scoreReasons.find((r) => r.basis === 'description')!.detail).toContain('maalat');
  });

  it('flags an allergy the patient entered', () => {
    const input = sampleInput({ allergies: ['manok'] });
    const out = checkAnalysis(mockAnalysis(input), input);
    expect(out.scoreReasons.find((r) => r.title === 'Matches an allergy you entered')?.deduction).toBe(3);
  });
});
