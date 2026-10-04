import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Reads an env var, treating blank values as unset.
 * Empty strings are common on hosting platforms (and dotenv never overrides
 * pre-set variables), so `??` alone would silently yield ""/0/NaN.
 */
function envValue(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function requireEnv(name: string, fallback?: string): string {
  const value = envValue(name) ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example at the project root.`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return envValue(name) ?? fallback;
}

function numberEnv(name: string, fallback: number): number {
  const raw = envValue(name);
  const parsed = raw === undefined ? fallback : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  env: optionalEnv('NODE_ENV', 'development'),
  port: numberEnv('PORT', 4000),
  mongoUri: requireEnv(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/glow-by-parveen'
  ),
  jwtSecret: requireEnv(
    'JWT_SECRET',
    'dev-only-insecure-secret-change-me-0f8a2b7c9d4e5f6a1b2c3d4e5f6a7b8c'
  ),
  jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '12h'),
  corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  publicSiteUrl: optionalEnv('PUBLIC_SITE_URL', 'http://localhost:5173'),
  publicApiUrl: optionalEnv('PUBLIC_API_URL', 'http://localhost:4000'),
  adminEmail: optionalEnv('ADMIN_EMAIL', 'admin@glowbyparveen.com'),
  adminPassword: optionalEnv('ADMIN_PASSWORD', '[CHANGE_ME_BEFORE_PRODUCTION]'),
  /** Run the idempotent bootstrap (admin + settings) on server start. */
  autoSeed: envValue('AUTO_SEED') === 'true',
  /** Static uploads are served from this route prefix. */
  uploadsUrlPrefix: '/uploads',
  /**
   * Cloudinary image storage. All three credentials are server-only secrets
   * and are read here, once: the API secret is never sent to the client, never
   * logged and never embedded in a response payload.
   */
  cloudinary: {
    cloudName: envValue('CLOUDINARY_CLOUD_NAME'),
    apiKey: envValue('CLOUDINARY_API_KEY'),
    apiSecret: envValue('CLOUDINARY_API_SECRET'),
    /** Folder new assets are uploaded into inside the Cloudinary account. */
    folder: optionalEnv('CLOUDINARY_FOLDER', 'glow-by-parveen'),
  },
  /** Hard limits enforced before anything touches Cloudinary. */
  upload: {
    maxBytes: numberEnv('UPLOAD_MAX_BYTES', 8 * 1024 * 1024),
    maxFiles: numberEnv('UPLOAD_MAX_FILES', 10),
  },
} as const;

export const isProd = config.env === 'production';

/**
 * Cloudinary is optional: when any of the three credentials is missing the API
 * keeps working and uploads fall back to local-disk storage (the pre-existing
 * behaviour). This lets local dev and un-migrated hosts run unchanged.
 */
export const isCloudinaryConfigured = Boolean(
  config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
);
