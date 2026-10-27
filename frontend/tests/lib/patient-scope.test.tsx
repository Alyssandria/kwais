import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PatientScopeProvider, scopedApiPath, scopedKey, useScopedHref } from '@/lib/patient-scope';

describe('scopedKey', () => {
  it('keeps the patient’s own cache keys unchanged', () => {
    expect(scopedKey(['meals', 'one', 'm1'], null)).toEqual(['meals', 'one', 'm1']);
  });

  it('separates each patient a doctor views', () => {
    expect(scopedKey(['meals', 'one', 'm1'], 'p1')).toEqual(['meals', 'one', 'm1', 'patient', 'p1']);
  });
});

describe('scopedApiPath', () => {
  it('leaves patient paths alone outside a scope', () => {
    expect(scopedApiPath(null, '/analytics/me')).toBe('/analytics/me');
  });

  it('maps patient endpoints to the doctor routes', () => {
    expect(scopedApiPath('p1', '/dashboard/patient')).toBe('/doctors/me/patients/p1/dashboard');
    expect(scopedApiPath('p1', '/analytics/me')).toBe('/doctors/me/patients/p1/analytics');
    expect(scopedApiPath('p1', '/patients/me/targets')).toBe('/doctors/me/patients/p1/targets');
    expect(scopedApiPath('p1', '/meals/m1')).toBe('/doctors/me/patients/p1/meals/m1');
  });

  it('refuses paths a doctor has no route for', () => {
    expect(() => scopedApiPath('p1', '/patients/me/consents')).toThrow('No doctor route');
    expect(() => scopedApiPath('p1', '/mealsx')).toThrow('No doctor route');
  });
});

describe('useScopedHref', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <PatientScopeProvider patientId="p1">{children}</PatientScopeProvider>;

  it('points patient pages at the doctor’s view of them', () => {
    const { result } = renderHook(() => useScopedHref(), { wrapper });
    expect(result.current('/patient/meals/m1')).toBe('/doctor/patients/p1/meals/m1');
    expect(result.current('/patient/analytics')).toBe('/doctor/patients/p1/trends');
    expect(result.current('/patient/profile')).toBe('/doctor/patients/p1/labs');
  });

  it('drops links a doctor can’t follow', () => {
    const { result } = renderHook(() => useScopedHref(), { wrapper });
    expect(result.current('/patient/meals/new')).toBeNull();
    expect(result.current('/patient/settings')).toBeNull();
  });
});
