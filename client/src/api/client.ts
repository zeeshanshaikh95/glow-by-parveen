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

// ── Image uploads (admin) ───────────────────────────────────────
// Mirrors the server-side limits in server/src/middleware/upload.ts. The server
// re-validates every file (including its magic bytes), so these constants only
// exist to fail fast with a friendly message.
export const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';
export const IMAGE_UPLOAD_TYPES_LABEL = 'JPG, JPEG, PNG or WebP';
export const IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_UPLOAD_MAX_FILES = 10;

/** An uploaded asset as returned by the API (Cloudinary secure_url + public_id). */
export interface UploadedImage {
  url: string;
  publicId: string;
  format?: string;
  bytes?: number;
  width?: number | null;
  height?: number | null;
}

async function readError(res: Response, fallback: string): Promise<ApiError> {
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    details?: Record<string, string>;
  };
  return new ApiError(res.status, payload.error || fallback, payload.details);
}

/**
 * Uploads files as multipart/form-data (admin only). Files are sent to our own
 * API, which validates them and stores them in Cloudinary — the browser never
 * receives a Cloudinary credential.
 */
export async function uploadImagesDetailed(files: File[]): Promise<UploadedImage[]> {
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
    throw await readError(res, 'Upload failed');
  }

  const data = (await res.json()) as {
    images?: UploadedImage[];
    urls?: string[];
  };
  // `urls` is the legacy shape; `images` carries the public_id alongside.
  if (Array.isArray(data.images)) {
    return data.images.map((image) => ({ ...image, url: resolveAssetUrl(image.url) }));
  }
  return (data.urls ?? []).map((url) => ({ url: resolveAssetUrl(url), publicId: '' }));
}

/** Convenience wrapper used by the admin image manager. */
export async function uploadImages(files: File[]): Promise<string[]> {
  const uploaded = await uploadImagesDetailed(files);
  return uploaded.map((image) => image.url);
}

/**
 * Asks the API to remove a Cloudinary asset. The API refuses (409) while the
 * image is still referenced by any document, so this is always safe to call:
 * a rejected cleanup simply means the asset is still in use.
 */
export async function deleteUploadedImage(url: string): Promise<{ released: boolean; reason: string }> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/api/admin/uploads`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    throw await readError(res, 'Image cleanup failed');
  }
  return (await res.json()) as { released: boolean; reason: string };
}
