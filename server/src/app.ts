import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config, isProd } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { uploadsDir } from './middleware/upload.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  await connectDatabase();

  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // ── Security & boilerplate middleware ─────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        // Allow tools like curl/Postman with no Origin header.
        if (!origin) {
          callback(null, true);
          return;
        }
        if (config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  app.use('/api', globalLimiter);

  // ── Static uploads (served publicly, filenames are random) ────
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.use(
    config.uploadsUrlPrefix,
    express.static(uploadsDir, {
      maxAge: '30d',
      immutable: true,
    })
  );

  // ── API routes ────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'glow-by-parveen-api', time: new Date().toISOString() });
  });
  app.use('/api', publicRoutes);
  app.use('/api/admin', adminRoutes);

  if (isProd) {
    app.get('/', (_req, res) => {
      res.json({
        service: 'Glow by Parveen API',
        status: 'running',
        docs: 'See /api/health',
      });
    });
  }

  // ── Errors ────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
