import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminUser } from '../models/index.js';
import { config } from '../config/env.js';
import { ApiError } from '../middleware/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { changePasswordSchema, loginSchema } from '../validation/schemas.js';
import type { AuthRequest } from '../middleware/auth.js';

function signToken(id: string, email: string): string {
  return jwt.sign({ sub: id, email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

/** POST /api/admin/auth/login */
export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Enter a valid email and password');
  }

  const { email, password } = parsed.data;
  const admin = await AdminUser.findOne({ email });
  if (!admin) {
    // Same message for unknown email / wrong password — no account enumeration.
    throw new ApiError(401, 'Invalid email or password');
  }

  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) {
    throw new ApiError(401, 'Invalid email or password');
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signToken(String(admin._id), admin.email);
  res.json({
    token,
    admin: { id: admin._id, email: admin.email, role: admin.role },
  });
});

/** GET /api/admin/auth/me */
export const me = asyncHandler(async (req: AuthRequest, res) => {
  res.json({ admin: req.admin });
});

/** PUT /api/admin/auth/password — change the admin password. */
export const changePassword = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const { currentPassword, newPassword } = parsed.data;
  const admin = await AdminUser.findById(req.admin!.id);
  if (!admin) {
    throw new ApiError(401, 'Session is no longer valid');
  }

  const match = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!match) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from the current password');
  }

  admin.passwordHash = await bcrypt.hash(newPassword, 12);
  await admin.save();

  res.json({ ok: true });
});
