import axios, { AxiosError } from 'axios';

/**
 * One Axios instance for the whole app.
 * Section 3 adds the access-token header and the silent refresh on 401.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  timeout: 30_000,
});

/** Shape every API error follows: { error: { code, message, details? } } */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

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
