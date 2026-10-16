import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  timeout: 30_000,
});

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { path: string; message: string }[] | unknown };
}

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let onSessionLost: (() => void) | null = null;
let onTokenRefreshed: ((data: SessionPayload) => void) | null = null;

export interface SessionPayload {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'doctor';
  firstName: string | null;
  lastName: string | null;
  patientCode: string | null;
  onboardingComplete: boolean;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionListeners(listeners: { onLost: () => void; onRefreshed: (d: SessionPayload) => void }) {
  onSessionLost = listeners.onLost;
  onTokenRefreshed = listeners.onRefreshed;
}

export function refreshSession(): Promise<string | null> {
  refreshInFlight ??= api
    .post<{ data: SessionPayload }>('/auth/refresh', undefined, { _skipAuthRetry: true } as AxiosRequestConfig)
    .then((res) => {
      accessToken = res.data.data.accessToken;
      onTokenRefreshed?.(res.data.data);
      return accessToken;
    })
    .catch(() => {
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean; _skipAuthRetry?: boolean };

api.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetryConfig | undefined;
    const code = error.response?.data?.error?.code;
    const status = error.response?.status;

    if (config && status === 401 && !config._retried && !config._skipAuthRetry && (code === 'token_expired' || code === 'unauthorized')) {
      config._retried = true;
      const token = await refreshSession();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
      onSessionLost?.();
    }
    return Promise.reject(error);
  },
);

export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    if (err.code === 'ECONNABORTED') return 'The server took too long to answer. Please try again.';
    if (!err.response) return 'Cannot reach K-WAIS right now. Check your connection.';
  }
  return 'Something went wrong. Please try again.';
}

export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof AxiosError)) return {};
  const body = err.response?.data as ApiErrorBody | undefined;
  if (body?.error?.code !== 'validation_failed' || !Array.isArray(body.error.details)) return {};
  const out: Record<string, string> = {};
  for (const d of body.error.details as { path: string; message: string }[]) {
    if (d.path && !out[d.path]) out[d.path] = d.message;
  }
  return out;
}
