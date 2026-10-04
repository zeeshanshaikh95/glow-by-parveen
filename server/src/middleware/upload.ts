import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './errors.js';
import { config, isCloudinaryConfigured } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, '../../uploads');

export const MAX_UPLOAD_BYTES = config.upload.maxBytes;
export const MAX_UPLOAD_FILES = Math.max(1, Math.floor(config.upload.maxFiles));

/** Image types accepted by the Cloudinary pipeline. */
export const CLOUDINARY_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * The legacy local-disk pipeline also accepted GIF/AVIF; that behaviour is kept
 * so an instance without Cloudinary credentials is not downgraded.
 */
const LEGACY_MIME = [...CLOUDINARY_MIME, 'image/gif', 'image/avif'];

export const UPLOAD_TYPES_LABEL = 'JPG, JPEG, PNG or WebP';
export const MAX_UPLOAD_MB = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Detects the real image type from the file's magic bytes. The client-supplied
 * `Content-Type` / extension can be spoofed, so this is the check that actually
 * decides whether an upload is a real image.
 */
export function sniffImageMime(buffer: Buffer | undefined): string | null {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  const brand = buffer.subarray(4, 12).toString('ascii');
  if (brand.startsWith('ftyp') && /^ftyp(avif|avis|mif1|msf1)/.test(brand)) return 'image/avif';
  if (buffer.subarray(0, 6).toString('ascii').startsWith('GIF8')) return 'image/gif';

  return null;
}

/**
 * Verifies buffered uploads (Cloudinary path) against both the allowlist and
 * their real content. Throws a 400 with a message the admin UI can display.
 */
export function assertUploadedImagesValid(files: Express.Multer.File[]): void {
  for (const file of files) {
    const sniffed = sniffImageMime(file.buffer);
    if (!sniffed) {
      throw new ApiError(
        400,
        `“${file.originalname}” is not a readable image file. Upload a ${UPLOAD_TYPES_LABEL} image.`
      );
    }
    if (!CLOUDINARY_MIME.includes(sniffed)) {
      throw new ApiError(
        400,
        `Unsupported image type for “${file.originalname}”. Use ${UPLOAD_TYPES_LABEL}.`
      );
    }
    const declared = (file.mimetype || '').toLowerCase();
    const matches =
      declared === sniffed || (sniffed === 'image/jpeg' && declared === 'image/jpg');
    if (declared && !matches) {
      throw new ApiError(
        400,
        `“${file.originalname}” content does not match its declared type (${declared}). Use ${UPLOAD_TYPES_LABEL}.`
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(
        400,
        `“${file.originalname}” is too large. Maximum size is ${MAX_UPLOAD_MB} MB per image.`
      );
    }
  }
}

function fileFilterFor(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!allowed.includes((file.mimetype || '').toLowerCase())) {
      cb(new ApiError(400, `Unsupported image type. Use ${UPLOAD_TYPES_LABEL}.`));
      return;
    }
    cb(null, true);
  };
}

const limits = { fileSize: MAX_UPLOAD_BYTES, files: MAX_UPLOAD_FILES };

/** Cloudinary path: keep bytes in memory so they can be streamed to the SDK. */
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits,
  fileFilter: fileFilterFor(CLOUDINARY_MIME),
}).array('images', MAX_UPLOAD_FILES);

/** Fallback path: unchanged local-disk storage under server/uploads. */
const diskUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base =
        path
          .basename(file.originalname, ext)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'image';
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      cb(null, `${base}-${unique}${ext}`);
    },
  }),
  limits,
  fileFilter: fileFilterFor(LEGACY_MIME),
}).array('images', MAX_UPLOAD_FILES);

/** Multer handler tuned for the storage backend the server is configured with. */
export const uploadImages = isCloudinaryConfigured ? memoryUpload : diskUpload;

/** Backwards-compatible alias (previous export name). */
export const uploadImage = uploadImages;

/** Maps multer/validation failures onto clean 400 responses. */
export function toUploadError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return new ApiError(
          400,
          `Each image must be ${MAX_UPLOAD_MB} MB or smaller.`
        );
      case 'LIMIT_FILE_COUNT':
      case 'LIMIT_UNEXPECTED_FILE':
        return new ApiError(400, `Upload at most ${MAX_UPLOAD_FILES} images at a time.`);
      default:
        return new ApiError(400, `Image upload rejected: ${err.message}`);
    }
  }
  return new ApiError(400, err instanceof Error ? err.message : 'Image upload failed');
}

/** Express middleware wrapper: runs multer and forwards clean errors. */
export function handleImageUpload(req: Request, res: Response, next: NextFunction): void {
  uploadImages(req, res, (err: unknown) => {
    if (err) {
      next(toUploadError(err));
      return;
    }
    next();
  });
}

export function uploadsUrlFor(filename: string): string {
  return `${config.uploadsUrlPrefix}/${filename}`;
}
