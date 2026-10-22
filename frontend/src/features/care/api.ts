import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DoctorCard {
  name: string;
  specialty: string | null;
  clinic: string | null;
  prcLicense: string | null;
}

export interface PatientCard {
  patientId: string;
  name: string;
  patientCode: string;
  ckdStage: { value: string; source: 'patient_entered' | 'clinician_verified' } | null;
  dialysisStatus: string;
}

export interface PatientCare {
  requests: { id: string; doctor: DoctorCard; message: string | null; createdAt: string }[];
  team: { id: string; doctor: DoctorCard; since: string }[];
  waiting: { id: string; kind: 'link' | 'invite'; label: string; createdAt: string; expiresAt: string | null }[];
}

export interface DoctorCare {
  requests: { id: string; patient: PatientCard; message: string | null; createdAt: string }[];
  waiting: { id: string; patientCode: string; createdAt: string }[];
  patients: { id: string; patient: PatientCard; since: string }[];
}

export type CareAction = 'approve' | 'decline' | 'cancel' | 'end';

const unwrap = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

const patientKey = ['care', 'patient'] as const;
const doctorKey = ['care', 'doctor'] as const;

export function usePatientCare() {
  return useQuery({ queryKey: patientKey, queryFn: () => unwrap<PatientCare>(api.get('/patients/me/care')) });
}

export function useDoctorCare() {
  return useQuery({ queryKey: doctorKey, queryFn: () => unwrap<DoctorCare>(api.get('/doctors/me/care')) });
}

export function useCareAction(role: 'patient' | 'doctor') {
  const qc = useQueryClient();
  const base = role === 'patient' ? '/patients/me/care' : '/doctors/me/care';
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: CareAction }) => api.post(`${base}/links/${id}/${action}`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: role === 'patient' ? patientKey : doctorKey }),
  });
}

export function useInviteDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; message?: string }) => unwrap<{ message: string }>(api.post('/patients/me/care/invites', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKey }),
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/patients/me/care/invites/${id}/cancel`).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientKey }),
  });
}

export function useRequestPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { patientCode: string; message?: string }) => unwrap<{ message: string }>(api.post('/doctors/me/care/requests', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKey }),
  });
}

export function useInvitePreview(token: string | null) {
  return useQuery({
    queryKey: ['care', 'invite', token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () => unwrap<{ patientName: string; message: string | null; expiresAt: string }>(api.get(`/doctors/me/care/invites/${encodeURIComponent(token!)}`)),
  });
}

export function useClaimInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => unwrap<{ linkId: string; patient: PatientCard }>(api.post('/doctors/me/care/invites/claim', { token })),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKey }),
  });
}

export const doctorDetails = (d: DoctorCard) => [d.specialty, d.clinic, d.prcLicense ? `PRC ${d.prcLicense}` : null].filter(Boolean).join(' · ');

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
