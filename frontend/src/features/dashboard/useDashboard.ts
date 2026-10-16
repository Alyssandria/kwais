import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PatientDashboard } from './types';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'patient'],
    queryFn: () => api.get<{ data: PatientDashboard }>('/dashboard/patient').then((r) => r.data.data),
  });
}
