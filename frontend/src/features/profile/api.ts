import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { scopedApiPath, scopedKey, usePatientScope } from '@/lib/patient-scope';
import type { NutrientKey } from '@/lib/nutrition';

export type ValueSource = 'patient_entered' | 'clinician_verified';
export type CkdStage = '1' | '2' | '3a' | '3b' | '4' | '5' | 'not_sure';
export type Dialysis = 'none' | 'hemodialysis' | 'peritoneal' | 'unknown';
export interface Verification {
  by: string | null;
  at: string;
}

export type Sex = 'female' | 'male' | 'intersex' | 'prefer_not_to_say';

export interface Profile {
  patientCode: string;
  firstName: string;
  lastName: string;
  birthYear: number | null;
  sex: Sex | null;
  dietaryPreferences: string[];
  allergies: string[];
  restrictions: string[];
  ckdStage: { value: CkdStage; source: ValueSource; verified: Verification | null } | null;
  dialysisStatus: Dialysis;
  reminderTime: string | null;
  timezone: string;
  onboarding: { step: number; complete: boolean };
  updatedAt: string;
}

export interface ProfilePatch {
  firstName?: string;
  lastName?: string;
  birthYear?: number | null;
  sex?: Sex | null;
  dietaryPreferences?: string[];
  allergies?: string[];
  restrictions?: string[];
  ckdStage?: CkdStage | null;
  dialysisStatus?: Dialysis;
  reminderTime?: string | null;
  onboardingStep?: number;
}

export interface Target {
  nutrient: NutrientKey;
  dailyMax: number;
  unit: string;
  source: ValueSource;
  note: string | null;
  since: string;
  verified: Verification | null;
}

export type LabTest =
  | 'potassium' | 'phosphorus' | 'sodium' | 'creatinine' | 'egfr' | 'bun' | 'albumin'
  | 'calcium' | 'hemoglobin' | 'bicarbonate' | 'pth' | 'uric_acid' | 'other';

export interface Lab {
  id: string;
  test: LabTest;
  label: string;
  value: number;
  refLow: number | null;
  refHigh: number | null;
  unit: string;
  collectedOn: string;
  labName: string | null;
  source: ValueSource;
  verified: Verification | null;
  createdAt: string;
}

export interface LabInput {
  test: LabTest;
  testLabel?: string | null;
  value: number;
  refLow?: number | null;
  refHigh?: number | null;
  unit: string;
  collectedOn: string;
  labName?: string | null;
}

type ConsentEntry = { granted: boolean; policyVersion: string; at: string } | null;
export interface Consents {
  terms: ConsentEntry;
  health_data: ConsentEntry;
  ai_processing: ConsentEntry;
  reminders: ConsentEntry;
}

const unwrap = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const keys = {
  profile: ['profile'] as const,
  targets: ['targets'] as const,
  labs: ['labs'] as const,
  consents: ['consents'] as const,
};

export function useProfile() {
  const scope = usePatientScope();
  return useQuery({ queryKey: scopedKey(keys.profile, scope), queryFn: () => unwrap<Profile>(api.get(scopedApiPath(scope, '/patients/me/profile'))) });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => unwrap<Profile>(api.patch('/patients/me/profile', patch)),
    onSuccess: (p) => qc.setQueryData(keys.profile, p),
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<Profile>(api.post('/patients/me/onboarding/complete')),
    onSuccess: (p) => qc.setQueryData(keys.profile, p),
  });
}

export function useTargets() {
  const scope = usePatientScope();
  return useQuery({ queryKey: scopedKey(keys.targets, scope), queryFn: () => unwrap<Target[]>(api.get(scopedApiPath(scope, '/patients/me/targets'))) });
}

export function useSetTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nutrient, dailyMax }: { nutrient: NutrientKey; dailyMax: number }) =>
      unwrap<Target>(api.put(`/patients/me/targets/${nutrient}`, { dailyMax })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.targets }),
  });
}

export function useRemoveTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nutrient: NutrientKey) => api.delete(`/patients/me/targets/${nutrient}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.targets }),
  });
}

export function useLabs() {
  const scope = usePatientScope();
  return useQuery({ queryKey: scopedKey(keys.labs, scope), queryFn: () => unwrap<Lab[]>(api.get(scopedApiPath(scope, '/labs'))) });
}

export function useCreateLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LabInput) => unwrap<Lab>(api.post('/labs', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.labs }),
  });
}

export function useUpdateLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LabInput> }) => unwrap<Lab>(api.patch(`/labs/${id}`, input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.labs }),
  });
}

export function useDeleteLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/labs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.labs }),
  });
}

export function useConsents() {
  return useQuery({ queryKey: keys.consents, queryFn: () => unwrap<Consents>(api.get('/patients/me/consents')) });
}

export function useChangeConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { consentType: 'ai_processing' | 'reminders'; granted: boolean }) =>
      unwrap<Consents>(api.post('/patients/me/consents', body)),
    onSuccess: (c) => qc.setQueryData(keys.consents, c),
  });
}
