import { notifyNetworkError } from './networkStatus';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const REQUEST_TIMEOUT_MS = 4000;

interface FetchOptions {
  method?: string;
  body?: string;
  auth?: boolean;
}

export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = localStorage.getItem('auth_access_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${url}`, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch {
    // No network, ECONNREFUSED, DNS failure, timeout (AbortError), etc.
    notifyNetworkError();
    throw new TypeError('Sin conexión al servidor');
  } finally {
    clearTimeout(timeoutId);
  }

  // 5xx = server/microservice unreachable or crashed → treat as connectivity issue
  if (response.status >= 500) {
    notifyNetworkError();
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.message ||
      errorData.error?.message ||
      `Error del servidor (${response.status})`;
    throw new Error(message);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.message ||
      errorData.error?.message ||
      `API error: ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;

  const json = await response.json();

  // Log visual para la consola del navegador
  if (json && typeof json === 'object' && json.instance) {
    console.log(`%c[LB] Request to ${url} processed by: %c${json.instance}`, 
      'color: #3b82f6; font-weight: bold;', 
      'color: #ef4444; font-weight: bold; background: #fee2e2; padding: 2px 4px; border-radius: 4px;');
    
    if (typeof window !== 'undefined') {
      (window as any).__last_lb_instance = json.instance;
    }
  }

  if (json && typeof json === 'object' && json.success === true && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}
