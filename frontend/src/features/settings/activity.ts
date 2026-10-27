import type { ActivityEntry } from './api';

const RESOURCE: Record<string, string> = {
  lab_result: 'a lab result',
  meal: 'a meal',
  meal_analysis: 'a meal analysis',
  nutrition_target: 'a daily target',
  patient_profile: 'your profile',
  onboarding: 'your setup progress',
  doctor_profile: 'your doctor profile',
  patient_record: 'your record',
  lab_results: 'your lab results',
  trends: 'your trends',
  meal_history: 'your meal history',
  ckd_stage: 'your CKD stage',
  clinical_note: 'a note for you',
};

const VERB: Record<string, string> = { create: 'Added', update: 'Changed', delete: 'Deleted', read: 'Viewed' };

const FIXED: Record<string, string> = {
  'login:user': 'Signed in',
  'login_failed:user': 'Failed sign-in attempt',
  'create:user': 'Created your account',
  'create:meal_analysis': 'Analysed a meal',
  'read:ai_processing': 'Sent meal details to the AI for analysis',
  'update:password': 'Changed your password',
  'update:password_reset_request': 'Asked for a password reset link',
  'update:sessions': 'Signed out on every device',
  'export:account_data': 'Downloaded a copy of your data',
  'delete:account': 'Deleted the account',
  'access_denied:refresh_token': 'Blocked a reused sign-in link and ended that session',
  'create:care_link': 'Care team request sent',
  'update:care_link': 'Care team request answered, or sharing changed',
  'create:care_invite': 'Invited a doctor by email',
  'update:care_invite': 'Cancelled or used a doctor invitation',
};

export function describeActivity(e: Pick<ActivityEntry, 'action' | 'resourceType' | 'byYou' | 'actorRole'>): string {
  const fixed = FIXED[`${e.action}:${e.resourceType}`];
  const text = fixed ?? `${VERB[e.action] ?? 'Changed'} ${RESOURCE[e.resourceType] ?? e.resourceType.replace(/_/g, ' ')}`;
  if (e.byYou || e.actorRole !== 'doctor') return text;
  return `Your clinician: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

export function isWarning(e: Pick<ActivityEntry, 'action'>): boolean {
  return e.action === 'login_failed' || e.action === 'access_denied';
}
