import bcrypt from 'bcryptjs';
import { AdminUser, SiteSettings } from '../models/index.js';
import { ApiError } from '../middleware/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { settingsInputSchema } from '../validation/schemas.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { ISiteSettings } from '../models/siteSettings.model.js';
import type { Document } from 'mongoose';

/** GET /api/admin/settings */
export const getAdminSettings = asyncHandler(async (_req: AuthRequest, res) => {
  const settings = await SiteSettings.findOne();
  res.json({ settings });
});

/** PUT /api/admin/settings */
export const updateAdminSettings = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = settingsInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  let settings = (await SiteSettings.findOne()) as
    | (ISiteSettings & Document)
    | null;
  if (!settings) {
    settings = new SiteSettings() as ISiteSettings & Document;
  }
  settings.set(parsed.data);
  const saved = await settings.save();

  res.json({ settings: saved });
});

export async function ensureAdminUser(email: string, password: string) {
  const existing = await AdminUser.findOne({ email }).lean();
  if (existing) return false;
  const passwordHash = await bcrypt.hash(password, 12);
  await AdminUser.create({ email, passwordHash, role: 'admin' });
  return true;
}
