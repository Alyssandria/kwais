import { useQuery } from '@tanstack/react-query';
import { buildSampleDashboard } from './sampleDashboard';
import type { PatientDashboard } from './types';

/**
 * Dashboard data. Until Section 8 this returns fictional sample data after a short
 * simulated delay (so loading states are visible). Section 8 replaces the queryFn with:
 *   (await api.get<{ data: PatientDashboard }>('/dashboard/patient')).data.data
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'patient'],
    queryFn: async (): Promise<PatientDashboard> => {
      await new Promise((r) => setTimeout(r, 400));
      return buildSampleDashboard();
    },
  });
}
