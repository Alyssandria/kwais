import type { Verification } from '@/features/profile/api';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });

export function verifiedText(v: Verification | null, fallback = 'your clinician'): string {
  if (!v) return `Verified by ${fallback}`;
  return `Verified by ${v.by ?? 'a former care team member'}, ${day(v.at)}`;
}
