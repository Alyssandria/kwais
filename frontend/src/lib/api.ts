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

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function streamLines<T>(path: string, onLine: (line: T) => void): Promise<void> {
  const send = (token: string | null) =>
    fetch(`${api.defaults.baseURL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/x-ndjson', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

  let res = await send(accessToken);
  if (res.status === 401) {
    const token = await refreshSession();
    if (!token) {
      onSessionLost?.();
      throw new ApiError('Your session ended. Please sign in again.', 401);
    }
    res = await send(token);
  }
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => undefined)) as ApiErrorBody | undefined;
    throw new ApiError(body?.error?.message ?? 'Something went wrong. Please try again.', res.status, body?.error?.code);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onLine(JSON.parse(line) as T);
    }
  }
  if (buffer.trim()) onLine(JSON.parse(buffer) as T);
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
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
