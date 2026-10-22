import { AiError, type AnalysisInput } from './types.js';
import type { AnalysisOutput, ReasonBasis } from './schemas.js';

export type ScoreBand = 'good' | 'mixed' | 'attention';

export function bandFor(score: number | null): ScoreBand | null {
  if (score == null) return null;
  if (score >= 8) return 'good';
  if (score >= 5) return 'mixed';
  return 'attention';
}

const SCORED_LABS = ['sodium', 'potassium', 'phosphorus'];

export type ScoreBasis = 'personal' | 'general';

export function scoreBasis(input: AnalysisInput): ScoreBasis | null {
  const { targets, labs } = input.supplied;
  if (targets && Object.keys(targets).length > 0) return 'personal';
  if (Object.entries(labs ?? {}).some(([test, l]) => SCORED_LABS.includes(test) && (l.refLow != null || l.refHigh != null))) return 'personal';
  const guided = Object.keys(input.guidance ?? {}) as (keyof AnalysisInput['meal']['totals'])[];
  return guided.some((n) => input.meal.totals[n]?.value != null) ? 'general' : null;
}

export const hasScoreBasis = (input: AnalysisInput) => scoreBasis(input) != null;

export const DESCRIPTION_CAP = 3;
const PER_REASON_CAP: Partial<Record<ReasonBasis, number>> = { description: 2, meal_share: 1 };

export function capDeductions(reasons: AnalysisOutput['scoreReasons']): AnalysisOutput['scoreReasons'] {
  let descriptionLeft = DESCRIPTION_CAP;
  return reasons.map((r) => {
    if (r.deduction == null) return r;
    if (r.basis === 'not_scored') return { ...r, deduction: null };
    let d = Math.min(r.deduction, PER_REASON_CAP[r.basis] ?? r.deduction);
    if (r.basis === 'description') {
      d = Math.min(d, descriptionLeft);
      descriptionLeft -= d;
    }
    return { ...r, deduction: d };
  });
}

// score = 10 − deductions (min 1); judgement from the meal description is capped; only supplied inputs and guidance may be cited
export function checkAnalysis(out: AnalysisOutput, input: AnalysisInput): AnalysisOutput {
  const allowed = new Set<string>(input.allowedInputs);
  const unknown = out.usedInputs.filter((k) => !allowed.has(k));
  if (unknown.length) throw new AiError('invalid_output', `Cited inputs that were not supplied: ${unknown.join(', ')}`);

  const basis = scoreBasis(input);
  if (!basis) {
    return { ...out, score: null, scoreBasis: null, scoreReasons: out.scoreReasons.map((r) => ({ ...r, deduction: null })) };
  }
  const scoreReasons = capDeductions(out.scoreReasons);
  const deducted = scoreReasons.reduce((sum, r) => sum + (r.deduction ?? 0), 0);
  return { ...out, scoreReasons, score: Math.max(1, 10 - deducted), scoreBasis: basis };
}
