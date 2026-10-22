import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type SessionPayload } from '@/lib/api';

export interface ActivityEntry {
  id: string;
  action: 'login' | 'login_failed' | 'read' | 'create' | 'update' | 'delete' | 'export' | 'access_denied';
  resourceType: string;
  at: string;
  byYou: boolean;
  actorRole: 'patient' | 'doctor' | null;
  device: string | null;
}

export function useActivity(limit = 30) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: () => api.get<{ data: ActivityEntry[] }>('/account/activity', { params: { limit } }).then((r) => r.data.data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.post<{ data: SessionPayload }>('/auth/change-password', body).then((r) => r.data.data),
  });
}

export function useLogoutEverywhere() {
  return useMutation({ mutationFn: () => api.post('/auth/logout-all').then(() => undefined) });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (body: { password: string; confirm: 'DELETE' }) => api.post('/account/delete', body).then(() => undefined),
  });
}

export function filenameFrom(disposition: string | undefined, fallback: string): string {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

export async function downloadMyData(): Promise<string> {
  const res = await api.get<Blob>('/account/export', { responseType: 'blob' });
  const name = filenameFrom(res.headers['content-disposition'] as string | undefined, 'kwais-export.json');
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

export function useDownloadMyData() {
  return useMutation({ mutationFn: downloadMyData });
}
