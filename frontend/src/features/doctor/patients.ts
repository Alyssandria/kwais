import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PatientCard } from '@/features/care/api';

export type Severity = 'bad' | 'warn' | 'info' | 'ok';
export type Status = 'above' | 'near' | 'within' | 'below' | 'none';

export interface PatientRow {
  linkId: string;
  since: string;
  patient: PatientCard;
  days: { date: string; logged: boolean }[];
  daysLogged: number;
  loggedToday: boolean;
  lastMealAt: string | null;
  daysSinceLastMeal: number | null;
  sodium: { average: number | null; limit: number; limitSource: 'target' | 'guidance'; daysWithData: number; daysOver: number; status: Status };
  lab: { label: string; value: number; unit: string; refLow: number | null; refHigh: number | null; collectedOn: string; status: Status; source: string } | null;
  unverifiedTargets: number;
  flags: { kind: string; severity: Severity; text: string }[];
  attention: number;
}

export interface PatientList {
  summary: { total: number; needsAttention: number; loggedToday: number; targetsUnverified: number };
  patients: PatientRow[];
}

export const patientsKey = ['doctor-patients'] as const;

export function useDoctorPatients() {
  return useQuery({ queryKey: patientsKey, queryFn: () => api.get<{ data: PatientList }>('/doctors/me/patients').then((r) => r.data.data) });
}
