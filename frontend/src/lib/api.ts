import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

/**
 * One Axios instance for the whole app.
 *
 * Session handling:
 * - The access token lives only in memory (never localStorage), set by the auth provider.
 * - The refresh token is an httpOnly cookie the browser sends to /auth/* automatically.
 * - On a 401 `token_expired`, the request is retried once after a silent refresh.
 *   Concurrent 401s share one refresh call.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  timeout: 30_000,
});

/** Shape every API error follows: { error: { code, message, details? } } */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: { path: string; message: string }[] | unknown };
}

// ─── Token plumbing ──────────────────────────────────────────────────────────

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

/** The auth provider registers these so the API layer can tell it about refreshes and logouts. */
export function setSessionListeners(listeners: { onLost: () => void; onRefreshed: (d: SessionPayload) => void }) {
  onSessionLost = listeners.onLost;
  onTokenRefreshed = listeners.onRefreshed;
}

/** Calls /auth/refresh once even if many requests ask at the same time. */
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

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Turns any thrown value into a sentence safe to show a patient. */
export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    if (err.code === 'ECONNABORTED') return 'The server took too long to answer. Please try again.';
    if (!err.response) return 'Cannot reach K-WAIS right now. Check your connection.';
  }
  return 'Something went wrong. Please try again.';
}

/** Field-level messages from a 400 validation_failed response, keyed by field path. */
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
