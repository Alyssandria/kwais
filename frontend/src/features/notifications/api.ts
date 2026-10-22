import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AppNotification {
  id: string;
  type: 'meal_reminder' | 'analysis_ready' | 'account' | 'care_team';
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface ListResponse {
  data: AppNotification[];
  meta: { unread: number };
}

const KEY = ['notifications'] as const;

export function useNotifications(opts: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<ListResponse>('/notifications').then((r) => ({ items: r.data.data, unread: r.data.meta.unread })),
    refetchInterval: opts.poll ? 5 * 60 * 1000 : false,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
