import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Profile } from '@/features/profile/api';
import type { PatientRow } from '../patients';

export interface PatientRecord extends PatientRow {
  profile: Profile;
}

export const recordKey = (patientId: string) => ['doctor-patients', patientId] as const;

export function usePatientRecord(patientId: string) {
  return useQuery({
    queryKey: recordKey(patientId),
    queryFn: () => api.get<{ data: PatientRecord }>(`/doctors/me/patients/${patientId}`).then((r) => r.data.data),
    retry: (count, err) => (err as { response?: { status?: number } }).response?.status !== 404 && count < 2,
  });
}
