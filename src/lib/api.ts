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
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}