import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  api,
  refreshSession,
  setAccessToken,
  setSessionListeners,
  type AuthUser,
  type SessionPayload,
} from '@/lib/api';
import type { LoginValues, RegisterValues } from './schemas';

type Status = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  login: (values: LoginValues) => Promise<AuthUser>;
  register: (values: RegisterValues) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Re-reads the signed-in user (e.g. after onboarding is completed). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the signed-in user. On first load it tries the refresh cookie, so a page reload
 * keeps you signed in without storing tokens in the browser.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();
  const started = useRef(false);

  const applySession = useCallback((s: SessionPayload) => {
    setAccessToken(s.accessToken);
    setUser(s.user);
    setStatus('signedIn');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('signedOut');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionListeners({ onLost: clearSession, onRefreshed: applySession });
  }, [applySession, clearSession]);

  // Restore the session once on startup (StrictMode runs effects twice in development).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void refreshSession().then((token) => {
      if (!token) setStatus('signedOut');
    });
  }, []);

  const login = useCallback(
    async (values: LoginValues) => {
      const res = await api.post<{ data: SessionPayload }>('/auth/login', values);
      applySession(res.data.data);
      return res.data.data.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (values: RegisterValues) => {
      const res = await api.post<{ data: SessionPayload }>('/auth/register', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        acceptTerms: values.acceptTerms,
        acceptHealthData: values.acceptHealthData,
      });
      applySession(res.data.data);
      return res.data.data.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ data: { user: AuthUser } }>('/auth/me');
    setUser(res.data.data.user);
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, refreshUser }),
    [status, user, login, register, logout, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Where each role lands after signing in. */
export function homeFor(user: AuthUser): string {
  return user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
}
