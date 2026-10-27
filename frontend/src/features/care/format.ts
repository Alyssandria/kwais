import type { PatientCard } from './api';

const STAGE: Record<string, string> = { '1': 'Stage 1', '2': 'Stage 2', '3a': 'Stage 3a', '3b': 'Stage 3b', '4': 'Stage 4', '5': 'Stage 5', not_sure: 'Stage not sure' };
const DIALYSIS: Record<string, string | null> = { hemodialysis: 'Hemodialysis', peritoneal: 'Peritoneal dialysis', none: null, unknown: null };

export function patientMeta(p: PatientCard): string {
  const stage = p.ckdStage ? `${STAGE[p.ckdStage.value] ?? p.ckdStage.value} · ${p.ckdStage.source === 'clinician_verified' ? 'verified' : 'entered by patient'}` : 'No CKD stage';
  return [p.patientCode, stage, DIALYSIS[p.dialysisStatus]].filter(Boolean).join(' · ');
}
