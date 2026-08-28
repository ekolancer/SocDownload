export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(input, { ...init, headers: new Headers(init.headers), credentials: 'include' });
  if (response.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login' && !String(input).includes('/api/settings/instagram/login')) {
    window.open('/login', '_self');
  }
  return response;
}

export async function apiError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return data.detail || data.message || `${fallback} (${response.status})`;
}
