import bcrypt from 'bcryptjs';
import { AdminUser, SiteSettings } from '../models/index.js';
import { ApiError } from '../middleware/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { settingsInputSchema } from '../validation/schemas.js';
import { publicIdForUrl, releaseUnusedImages } from '../services/mediaService.js';
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

  const previousHeroImage = String(settings.get('hero.imageUrl') ?? '');
  const previousFounderImage = String(settings.get('about.founderImageUrl') ?? '');

  settings.set(parsed.data);
  // public_ids are derived from the stored secure_urls — the client never sends
  // camera credentials or Cloudinary internals, only the URL it already has.
  settings.set(
    'hero.imagePublicId',
    (await publicIdForUrl(String(settings.get('hero.imageUrl') ?? ''))) ?? ''
  );
  settings.set(
    'about.founderImagePublicId',
    (await publicIdForUrl(String(settings.get('about.founderImageUrl') ?? ''))) ?? ''
  );
  const saved = await settings.save();

  // Replaced hero / founder images are destroyed only if nothing else uses them.
  const replaced = [
    previousHeroImage !== saved.hero?.imageUrl ? previousHeroImage : '',
    previousFounderImage !== saved.about?.founderImageUrl ? previousFounderImage : '',
  ].filter(Boolean);
  await releaseUnusedImages(replaced);

  res.json({ settings: saved });
});

export async function ensureAdminUser(email: string, password: string) {
  const existing = await AdminUser.findOne({ email }).lean();
  if (existing) return false;
  const passwordHash = await bcrypt.hash(password, 12);
  await AdminUser.create({ email, passwordHash, role: 'admin' });
  return true;
}
