import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AdminUser } from '../models/index.js';

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
  };
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

/** Verifies the JWT and attaches the admin identity to the request. */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = jwt.verify(token, config.jwtSecret) as {
      sub: string;
      email: string;
    };

    // Confirm the admin still exists — tokens of deleted accounts are revoked effectively.
    const admin = await AdminUser.findById(payload.sub).select('_id email').lean();
    if (!admin) {
      res.status(401).json({ error: 'Session is no longer valid' });
      return;
    }

    req.admin = { id: String(admin._id), email: admin.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
