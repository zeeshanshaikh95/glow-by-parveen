import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface ZodLikeError {
  issues?: Array<{ path: (string | number)[]; message: string }>;
  errors?: Record<string, { message: string }>;
}

function formatZodError(err: ZodLikeError): Record<string, string> | undefined {
  if (err.issues) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.length ? issue.path.join('.') : '_';
      details[key] = issue.message;
    }
    return details;
  }
  if (err.errors) {
    const details: Record<string, string> = {};
    for (const [key, val] of Object.entries(err.errors)) {
      details[key] = val.message;
    }
    return details;
  }
  return undefined;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** Central error handler — keeps stack traces and internals out of client responses. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string> = {};
    for (const [key, val] of Object.entries(err.errors)) {
      details[key] = val.message;
    }
    res.status(400).json({ error: 'Validation failed', details });
    return;
  }

  if (typeof err === 'object' && err !== null) {
    const zodErr = err as ZodLikeError;
    const details = formatZodError(zodErr);
    if (details || zodErr.issues || zodErr.errors) {
      res.status(400).json({ error: 'Validation failed', details: details ?? {} });
      return;
    }
  }

  if (typeof err === 'object' && err !== null && 'code' in err) {
    const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
    if (mongoErr.code === 11000) {
      const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field';
      res.status(409).json({ error: `A record with this ${field} already exists` });
      return;
    }
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: 'Invalid identifier format' });
    return;
  }

  console.error('[api] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
