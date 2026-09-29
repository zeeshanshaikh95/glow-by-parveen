import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { ApiError } from './errors.js';
import { config, isProd } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, '../../uploads');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(new ApiError(400, 'Unsupported image type. Use JPEG, PNG, WebP, GIF or AVIF.'));
      return;
    }
    cb(null, true);
  },
}).array('images', 10);

export function uploadsUrlFor(filename: string): string {
  const base = isProd ? config.publicApiUrl : '';
  return `${config.uploadsUrlPrefix}/${filename}`;
}
