import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NutrientKey } from '@/lib/nutrition';
import type { Note } from '@/features/notes/api';
import type { CkdStage, Lab, LabInput, Profile, Target } from '@/features/profile/api';
import { patientsKey } from '../patients';

const unwrap = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);
const base = (patientId: string) => `/doctors/me/patients/${patientId}`;

export const notesKey = (patientId: string) => ['notes', 'patient', patientId] as const;

function refreshPatient(qc: QueryClient, patientId: string) {
  void qc.invalidateQueries({ predicate: (q) => q.queryKey.includes(patientId) });
  void qc.invalidateQueries({ queryKey: patientsKey });
}

function useClinicalMutation<V, T>(patientId: string, fn: (v: V) => Promise<T>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => refreshPatient(qc, patientId) });
}

export function useSetStage(patientId: string) {
  return useClinicalMutation(patientId, (ckdStage: Exclude<CkdStage, 'not_sure'>) => unwrap<Profile>(api.put(`${base(patientId)}/ckd-stage`, { ckdStage })));
}

export function useSetPatientTarget(patientId: string) {
  return useClinicalMutation(patientId, ({ nutrient, dailyMax, note }: { nutrient: NutrientKey; dailyMax: number; note: string | null }) =>
    unwrap<Target>(api.put(`${base(patientId)}/targets/${nutrient}`, { dailyMax, note })),
  );
}

export function useAddPatientLab(patientId: string) {
  return useClinicalMutation(patientId, (input: LabInput) => unwrap<Lab>(api.post(`${base(patientId)}/labs`, input)));
}

export function useCorrectPatientLab(patientId: string) {
  return useClinicalMutation(patientId, ({ id, input }: { id: string; input: Partial<LabInput> }) => unwrap<Lab>(api.patch(`${base(patientId)}/labs/${id}`, input)));
}

export function useVerifyPatientLab(patientId: string) {
  return useClinicalMutation(patientId, (id: string) => unwrap<Lab>(api.post(`${base(patientId)}/labs/${id}/verify`)));
}

export function usePatientNotes(patientId: string) {
  return useQuery({ queryKey: notesKey(patientId), queryFn: () => unwrap<Note[]>(api.get(`${base(patientId)}/notes`)) });
}

export function useAddNote(patientId: string) {
  return useClinicalMutation(patientId, (body: string) => unwrap<Note>(api.post(`${base(patientId)}/notes`, { body })));
}

export function useEditNote(patientId: string) {
  return useClinicalMutation(patientId, ({ id, body }: { id: string; body: string }) => unwrap<Note>(api.patch(`${base(patientId)}/notes/${id}`, { body })));
}

export function useDeleteNote(patientId: string) {
  return useClinicalMutation(patientId, (id: string) => api.delete(`${base(patientId)}/notes/${id}`).then(() => undefined));
}
