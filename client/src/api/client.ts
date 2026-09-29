import { getAuthToken, clearAuthToken } from '../auth/token';

export class ApiError extends Error {
  status: number;
  details?: Record<string, string>;

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Base URL of the REST API.
 * - Empty in local dev: Vite proxies /api → http://localhost:4000.
 * - Absolute (e.g. https://api.example.com) when the SPA is hosted separately
 *   from the API, e.g. GitHub Pages frontend + free-tier backend.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Resolves an upload path returned by the API to a loadable URL. */
export function resolveAssetUrl(url: string): string {
  if (!url) return '';
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
  return API_BASE ? `${API_BASE}${url}` : url;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(0, 'Network error — is the API server running?');
  }

  if (res.status === 401 && getAuthToken()) {
    // Token expired/invalid while authenticated — clear and force re-login.
    clearAuthToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const payload = (data ?? {}) as { error?: string; details?: Record<string, string> };
    throw new ApiError(res.status, payload.error || `Request failed (${res.status})`, payload.details);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'DELETE', signal }),
};

/** Uploads files as multipart/form-data (admin only). */
export async function uploadImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/admin/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, payload.error || 'Upload failed');
  }
  const data = (await res.json()) as { urls: string[] };
  return data.urls.map(resolveAssetUrl);
}
