import { useQuery } from '@tanstack/react-query';
import { buildSampleDashboard } from './sampleDashboard';
import type { PatientDashboard } from './types';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'patient'],
    queryFn: async (): Promise<PatientDashboard> => {
      await new Promise((r) => setTimeout(r, 400));
      return buildSampleDashboard();
    },
  });
}
