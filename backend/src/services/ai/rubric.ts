import { AiError, type AnalysisInput } from './types.js';
import type { AnalysisOutput } from './schemas.js';

export type ScoreBand = 'good' | 'mixed' | 'attention';

export function bandFor(score: number | null): ScoreBand | null {
  if (score == null) return null;
  if (score >= 8) return 'good';
  if (score >= 5) return 'mixed';
  return 'attention';
}

const SCORED_LABS = ['sodium', 'potassium', 'phosphorus'];

export function hasScoreBasis(input: AnalysisInput): boolean {
  const { targets, labs } = input.supplied;
  if (targets && Object.keys(targets).length > 0) return true;
  return Object.entries(labs ?? {}).some(([test, l]) => SCORED_LABS.includes(test) && (l.refLow != null || l.refHigh != null));
}

// score = 10 − deductions (min 1); no score without a basis; only supplied inputs may be cited
export function checkAnalysis(out: AnalysisOutput, input: AnalysisInput): AnalysisOutput {
  const allowed = new Set<string>(input.allowedInputs);
  const unknown = out.usedInputs.filter((k) => !allowed.has(k));
  if (unknown.length) throw new AiError('invalid_output', `Cited inputs that were not supplied: ${unknown.join(', ')}`);

  if (!hasScoreBasis(input)) {
    return { ...out, score: null, scoreReasons: out.scoreReasons.map((r) => ({ ...r, deduction: null })) };
  }
  const deducted = out.scoreReasons.reduce((sum, r) => sum + (r.deduction ?? 0), 0);
  return { ...out, score: Math.max(1, 10 - deducted) };
}
