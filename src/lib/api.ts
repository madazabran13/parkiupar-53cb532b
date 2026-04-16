const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Support both { message } and { error: { message } } shapes
    const message =
      errorData.message ||
      errorData.error?.message ||
      `API error: ${response.status}`;
    throw new Error(message);
  }

  // 204 No Content — no body to parse
  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();

  // Auto-unwrap { success: true, data: T } envelope returned by the gateway/microservices
  if (json && typeof json === 'object' && json.success === true && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}
