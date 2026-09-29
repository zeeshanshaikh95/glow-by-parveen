import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. See .env.example at the project root.`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: requireEnv(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/glow-by-parveen'
  ),
  jwtSecret: requireEnv(
    'JWT_SECRET',
    'dev-only-insecure-secret-change-me-0f8a2b7c9d4e5f6a1b2c3d4e5f6a7b8c'
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? 'http://localhost:5173',
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:4000',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@glowbyparveen.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? '[CHANGE_ME_BEFORE_PRODUCTION]',
  /** Static uploads are served from this route prefix. */
  uploadsUrlPrefix: '/uploads',
} as const;

export const isProd = config.env === 'production';
