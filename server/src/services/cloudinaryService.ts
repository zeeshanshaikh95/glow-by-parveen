import { v2 as cloudinary } from 'cloudinary';
import { config, isCloudinaryConfigured } from '../config/env.js';
import { ApiError } from '../middleware/errors.js';

/**
 * Cloudinary storage adapter.
 *
 * Everything here is server-side only: the API secret never leaves this
 * process. Uploads are buffered in memory and pushed with the signed SDK call,
 * so the browser never receives credentials and unsigned/direct uploads are not
 * possible from the client.
 */

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
}

/** Result of a destroy call — `not_found` means it was already gone. */
export type CloudinaryDestroyResult = 'deleted' | 'not_found';

let configured = false;

/** The three server-side credentials, or a 503 when the feature is disabled. */
function credentials(): { cloudName: string; apiKey: string; apiSecret: string } {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      503,
      'Image storage is not configured on this server (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).'
    );
  }
  return { cloudName, apiKey, apiSecret };
}

/** Lazily configures the SDK so a missing env var can never break boot. */
function ensureConfigured(): void {
  const { cloudName, apiKey, apiSecret } = credentials();
  if (configured) return;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  configured = true;
}

/**
 * Redacts Cloudinary credentials from any text before it reaches a log or a
 * client response. Value-based first (covers the real secret verbatim), then
 * pattern-based for query-string style leaks.
 */
export function redactCloudinarySecrets(text: string): string {
  const { apiKey, apiSecret } = config.cloudinary;
  let safe = text;
  if (apiSecret) safe = safe.split(apiSecret).join('[CLOUDINARY_API_SECRET]');
  if (apiKey) safe = safe.split(apiKey).join('[CLOUDINARY_API_KEY]');
  return safe
    .replace(/\b(api_secret|api_key)=[^&\s"'`]+/gi, '$1=[redacted]')
    .replace(/\b(basic|bearer)\s+[A-Za-z0-9+/=._-]{12,}/gi, '$1 [redacted]');
}

/** Turns an SDK/network failure into a safe, non-leaking ApiError. */
function toUploadApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const raw =
    typeof (err as { message?: unknown })?.message === 'string'
      ? String((err as { message: string }).message)
      : String(err ?? 'unknown error');
  return new ApiError(502, `Cloudinary upload failed: ${redactCloudinarySecrets(raw)}`);
}

/** Uploads an in-memory image buffer. Only call after validating type/size. */
export function uploadImageBuffer(buffer: Buffer, originalName: string): Promise<CloudinaryUploadResult> {
  ensureConfigured();
  const { folder } = config.cloudinary;

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        type: 'upload',
        // Keep a readable slug from the original filename, but always make the
        // final name unique so re-uploads never overwrite/require overwrite.
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        filename_override: originalName || undefined,
      },
      (error, result) => {
        if (error || !result) {
          const safe = redactCloudinarySecrets(String(error?.message ?? 'unknown error'));
          console.error('[cloudinary] upload failed:', safe);
          reject(toUploadApiError(error));
          return;
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format ?? '',
          bytes: Number(result.bytes) || buffer.byteLength,
          width: Number(result.width) || null,
          height: Number(result.height) || null,
        });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Credential check used by tooling (`npm run media:check`). Goes through the
 * same lazy configuration as uploads, so a green ping also proves the env vars
 * this process will actually use are correct.
 */
export async function pingCloudinary(): Promise<string> {
  ensureConfigured();
  const result = await cloudinary.api.ping();
  return String(result?.status ?? 'ok');
}

/** Destroys one asset by public_id. Missing assets are treated as success. */
export async function destroyAsset(publicId: string): Promise<CloudinaryDestroyResult> {
  ensureConfigured();
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    return result?.result === 'ok' ? 'deleted' : 'not_found';
  } catch (err) {
    throw toUploadApiError(err);
  }
}

/** True when the URL points at an image in *this* Cloudinary account. */
export function isCloudinaryUrl(url: string): boolean {
  const cloudName = config.cloudinary.cloudName;
  if (!cloudName || !url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.split('/').filter(Boolean)[0] === cloudName
    );
  } catch {
    return false;
  }
}

/**
 * Best-effort public_id recovery from a delivery URL, used for assets that
 * predate the media registry.
 *
 * Deliberately strict: only `…/image/upload/v<version>/<public_id>.<ext>` — the
 * exact shape Cloudinary returns as `secure_url` — is parsed. Anything else
 * (transformations, no version, a folder that merely *looks* like `v2`) returns
 * null so the caller falls back to the registry instead of guessing, because a
 * guess here could destroy the wrong asset.
 */
export function publicIdFromUrl(url: string): string | null {
  const cloudName = config.cloudinary.cloudName;
  if (!cloudName || !isCloudinaryUrl(url)) return null;

  const parsed = new URL(url);
  const segments = parsed.pathname.split('/').filter(Boolean);
  // ['<cloud-name>', 'image', 'upload', ...rest]
  if (segments[1] !== 'image' || segments[2] !== 'upload') return null;

  const rest = segments.slice(3);
  // The version must be the first segment after `upload` — that is the only
  // unambiguous position (any earlier segment could be a transformation).
  // Real version segments are upload timestamps (9–11 digits). Requiring that
  // shape keeps folder names like `v2` or `v20240101` from being mistaken for
  // a version, which would hand back the wrong public_id.
  if (rest.length < 2 || !/^v\d{9,11}$/.test(rest[0])) return null;

  const assetPath = rest.slice(1).join('/');
  if (!assetPath) return null;

  const dot = assetPath.lastIndexOf('.');
  const publicId = dot > 0 ? assetPath.slice(0, dot) : assetPath;
  return publicId || null;
}

/** Formats the operator-facing startup line: never includes credentials. */
export function cloudinaryStatusLine(): string {
  if (!isCloudinaryConfigured) {
    return '[cloudinary] not configured — uploads use local disk storage (/uploads)';
  }
  const { cloudName, folder } = config.cloudinary;
  return `[cloudinary] configured — cloud "${cloudName}", folder "${folder}"`;
}
