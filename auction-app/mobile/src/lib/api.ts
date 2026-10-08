import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base URL. Set EXPO_PUBLIC_API_URL for staging/production. In development
 * we reuse the host Metro is served from, so a phone on the same Wi-Fi reaches
 * the server running on your computer without any configuration.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:4000/api`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api';
}

export const API_URL = resolveApiUrl();
export const API_ORIGIN = API_URL.replace(/\/api$/, '');

/** Image URLs from the server may be relative ("/uploads/x.jpg"). */
export function imageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
}

// ---- server clock -------------------------------------------------------
// Countdowns and "has it ended?" must follow the server, never the phone clock.

let clockOffset = 0;

export function serverNow() {
  return Date.now() + clockOffset;
}

export function syncClock(serverTime: number, sentAt?: number) {
  const now = Date.now();
  const latency = sentAt ? (now - sentAt) / 2 : 0;
  clockOffset = serverTime + latency - now;
}

// ---- requests ------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  code: string;
  data: Record<string, unknown>;
  constructor(status: number, code: string, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function getAuthToken() {
  return authToken;
}

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  form?: FormData;
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let body: BodyInit | undefined;
  if (options.form) body = options.form;
  else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const sentAt = Date.now();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }
  const serverTime = Number(res.headers.get('X-Server-Time'));
  if (serverTime) syncClock(serverTime, sentAt);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? 'Algo ha ido mal', err);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>('POST', path, { body: body ?? {}, headers }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Algo ha ido mal';
}

export function newIdempotencyKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}
