import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { scopedApiPath, scopedKey, usePatientScope } from '@/lib/patient-scope';
import type { PatientDashboard } from './types';

export function useDashboard() {
  const scope = usePatientScope();
  return useQuery({
    queryKey: scopedKey(['dashboard', 'patient'], scope),
    queryFn: () => api.get<{ data: PatientDashboard }>(scopedApiPath(scope, '/dashboard/patient')).then((r) => r.data.data),
  });
}
