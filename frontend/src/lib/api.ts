const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (API_TOKEN) headers.set('Authorization', `Bearer ${API_TOKEN}`);
  return fetch(input, { ...init, headers });
}

export async function apiError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return data.detail || data.message || `${fallback} (${response.status})`;
}
