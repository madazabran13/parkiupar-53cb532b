/**
 * apiClient — fetch wrapper tipado para el BFF gateway.
 * - Adjunta `Authorization: Bearer <access_token>` desde la sesión Supabase.
 * - Normaliza errores del gateway en `ApiError` con `code`, `message`, `details`.
 * - En 401 hace signOut y redirige a /login.
 *
 * No expone el cliente Supabase admin: el gateway server-side lo usa internamente.
 */
import { supabase } from '@/integrations/supabase/client';

const RAW_BASE = (import.meta.env.VITE_API_URL ?? '/api').toString();
const API_BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

export const USE_GATEWAY =
  String(import.meta.env.VITE_USE_GATEWAY ?? 'false').toLowerCase() === 'true';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Json = Record<string, unknown> | unknown[] | null;

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Json;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function handle401(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } finally {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(await authHeader()),
    ...(opts.headers ?? {}),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    credentials: 'same-origin',
  });

  if (res.status === 401) {
    await handle401();
    throw new ApiError(401, 'UNAUTHORIZED', 'Sesión expirada');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload: unknown = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const err = (payload ?? {}) as { code?: string; message?: string; details?: unknown };
    throw new ApiError(
      res.status,
      err.code ?? 'HTTP_ERROR',
      err.message ?? `Error ${res.status}`,
      err.details,
    );
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: Json, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('POST', path, { ...opts, body: body ?? null }),
  patch: <T>(path: string, body?: Json, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('PATCH', path, { ...opts, body: body ?? null }),
  put: <T>(path: string, body?: Json, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('PUT', path, { ...opts, body: body ?? null }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('DELETE', path, opts),
} as const;
