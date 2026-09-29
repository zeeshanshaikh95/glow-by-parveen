import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AdminUser } from '../models/index.js';

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    /** True while bootstrap credentials are still in use. */
    mustChangePassword: boolean;
  };
}

/**
 * Blocks every admin operation until the first-login password change is done.
 * Mounted after requireAuth, but never on /auth/me and /auth/password.
 */
export function requirePasswordChanged(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.admin?.mustChangePassword) {
    res.status(403).json({
      error: 'Password change required before using the admin panel',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
    return;
  }
  next();
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
    // mustChangePassword rides along so routes can force a first-login password rotation.
    const admin = await AdminUser.findById(payload.sub)
      .select('_id email mustChangePassword')
      .lean();
    if (!admin) {
      res.status(401).json({ error: 'Session is no longer valid' });
      return;
    }

    req.admin = {
      id: String(admin._id),
      email: admin.email,
      mustChangePassword: Boolean(admin.mustChangePassword),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
