import { describe, expect, it } from 'vitest';
import { mockAnalysis } from '../../../src/services/ai/mock.provider.js';
import { bandFor, checkAnalysis, hasScoreBasis } from '../../../src/services/ai/rubric.js';
import type { AnalysisOutput } from '../../../src/services/ai/schemas.js';
import { sampleInput } from '../../fixtures/analysis-input.js';

const output = (over: Partial<AnalysisOutput> = {}): AnalysisOutput => ({
  score: 10,
  scoreReasons: [
    { title: 'Sodium over target', detail: '…', deduction: 2 },
    { title: 'Restriction', detail: '…', deduction: 2 },
    { title: 'Phosphorus not scored', detail: '…', deduction: null },
  ],
  summary: '…',
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
    const many = output({ scoreReasons: Array.from({ length: 4 }, () => ({ title: 't', detail: 'd', deduction: 3 })) });
    expect(checkAnalysis(many, sampleInput()).score).toBe(1);
  });

  it('removes the score when nothing was supplied to judge against', () => {
    const input = sampleInput({ targets: undefined, labs: undefined });
    const out = checkAnalysis(output({ usedInputs: ['meal', 'restrictions'] }), input);
    expect(out.score).toBeNull();
    expect(out.scoreReasons.every((r) => r.deduction === null)).toBe(true);
  });

  it('rejects an analysis that cites something the patient did not supply', () => {
    expect(() => checkAnalysis(output({ usedInputs: ['meal', 'ckdStage'] }), sampleInput())).toThrow(/ckdStage/);
  });
});

describe('hasScoreBasis and bands', () => {
  it('needs a target, or a sodium, potassium or phosphorus lab with a range', () => {
    expect(hasScoreBasis(sampleInput())).toBe(true);
    expect(hasScoreBasis(sampleInput({ targets: undefined }))).toBe(true);
    const noRange = { potassium: { label: 'Potassium', value: 5.6, unit: 'mmol/L', refLow: null, refHigh: null, collectedOn: '2026-09-28', source: 'patient_entered' } };
    expect(hasScoreBasis(sampleInput({ targets: undefined, labs: noRange }))).toBe(false);
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

  it('gives no score and says what to add when nothing was supplied', () => {
    const input = sampleInput({ targets: undefined, labs: undefined, restrictions: undefined });
    input.allowedInputs = ['meal', 'day'];
    const out = checkAnalysis(mockAnalysis(input), input);
    expect(out.score).toBeNull();
    expect(out.scoreReasons[0]!.title).toBe('No score yet');
  });

  it('flags an allergy the patient entered', () => {
    const input = sampleInput({ allergies: ['manok'] });
    const out = checkAnalysis(mockAnalysis(input), input);
    expect(out.scoreReasons.find((r) => r.title === 'Matches an allergy you entered')?.deduction).toBe(3);
  });
});
