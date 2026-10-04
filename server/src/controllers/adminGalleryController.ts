import { GalleryItem } from '../models/index.js';
import { ApiError } from '../middleware/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { galleryItemInputSchema } from '../validation/schemas.js';
import { publicIdForUrl, releaseUnusedImages } from '../services/mediaService.js';
import type { AuthRequest } from '../middleware/auth.js';

/** GET /api/admin/gallery — all gallery items. */
export const listAdminGallery = asyncHandler(async (_req: AuthRequest, res) => {
  const items = await GalleryItem.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
  res.json({ items });
});

/** POST /api/admin/gallery — create a gallery item. */
export const createGalleryItem = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = galleryItemInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const item = await GalleryItem.create({
    ...parsed.data,
    imagePublicId: (await publicIdForUrl(parsed.data.image)) ?? '',
  });
  res.status(201).json({ item });
});

/** PUT /api/admin/gallery/:id — update a gallery item. */
export const updateGalleryItem = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = galleryItemInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const existing = await GalleryItem.findById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Gallery item not found');
  }

  const previousImage = existing.image;
  existing.set({
    ...parsed.data,
    imagePublicId: (await publicIdForUrl(parsed.data.image)) ?? '',
  });
  const item = await existing.save();

  if (previousImage && previousImage !== item.image) {
    await releaseUnusedImages([previousImage]);
  }
  res.json({ item });
});

/** DELETE /api/admin/gallery/:id — delete a gallery item. */
export const deleteGalleryItem = asyncHandler(async (req: AuthRequest, res) => {
  const item = await GalleryItem.findByIdAndDelete(req.params.id);
  if (!item) {
    throw new ApiError(404, 'Gallery item not found');
  }

  if (item.image) {
    await releaseUnusedImages([item.image]);
  }
  res.json({ ok: true });
});
