import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DoctorProfile {
  firstName: string;
  lastName: string;
  prcLicense: string | null;
  specialty: string | null;
  clinic: string | null;
  updatedAt: string;
}

export type DoctorProfilePatch = Partial<Pick<DoctorProfile, 'firstName' | 'lastName'>> & {
  prcLicense?: string;
  specialty?: string;
  clinic?: string;
};

const key = ['doctor-profile'] as const;

export function useDoctorProfile() {
  return useQuery({ queryKey: key, queryFn: () => api.get<{ data: DoctorProfile }>('/doctors/me/profile').then((r) => r.data.data) });
}

export function useUpdateDoctorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: DoctorProfilePatch) => api.patch<{ data: DoctorProfile }>('/doctors/me/profile', patch).then((r) => r.data.data),
    onSuccess: (p) => qc.setQueryData(key, p),
  });
}

export function displayName(p: Pick<DoctorProfile, 'firstName' | 'lastName'>) {
  return `Dr. ${p.firstName} ${p.lastName}`;
}
