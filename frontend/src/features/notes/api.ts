import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Note {
  id: string;
  body: string;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  mine: boolean;
}

export const myNotesKey = ['notes'] as const;

export function useMyNotes() {
  return useQuery({ queryKey: myNotesKey, queryFn: () => api.get<{ data: Note[] }>('/patients/me/notes').then((r) => r.data.data) });
}
