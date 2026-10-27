import { createContext, useContext, type ReactNode } from 'react';

const PatientScopeContext = createContext<string | null>(null);

export function PatientScopeProvider({ patientId, children }: { patientId: string; children: ReactNode }) {
  return <PatientScopeContext.Provider value={patientId}>{children}</PatientScopeContext.Provider>;
}

export function usePatientScope(): string | null {
  return useContext(PatientScopeContext);
}

export function scopedKey<T extends readonly unknown[]>(key: T, patientId: string | null): readonly unknown[] {
  return patientId ? [...key, 'patient', patientId] : key;
}

const API_ROUTES: [string, string][] = [
  ['/dashboard/patient', '/dashboard'],
  ['/analytics/me', '/analytics'],
  ['/patients/me/profile', '/profile'],
  ['/patients/me/targets', '/targets'],
  ['/labs', '/labs'],
  ['/meals', '/meals'],
];

export function scopedApiPath(patientId: string | null, path: string): string {
  if (!patientId) return path;
  const base = `/doctors/me/patients/${patientId}`;
  for (const [from, to] of API_ROUTES) {
    if (path === from || path.startsWith(`${from}/`) || path.startsWith(`${from}?`)) return base + to + path.slice(from.length);
  }
  throw new Error(`No doctor route for ${path}`);
}

const PAGE_ROUTES: [string, string][] = [
  ['/patient/meals', '/meals'],
  ['/patient/labs', '/labs'],
  ['/patient/profile', '/labs'],
  ['/patient/analytics', '/trends'],
];

export function useScopedHref(): (path: string) => string | null {
  const patientId = usePatientScope();
  return (path) => {
    if (!patientId) return path;
    if (path.startsWith('/patient/meals/new')) return null;
    for (const [from, to] of PAGE_ROUTES) {
      if (path === from || path.startsWith(`${from}/`)) return `/doctor/patients/${patientId}${to}${path.slice(from.length)}`;
    }
    return null;
  };
}
