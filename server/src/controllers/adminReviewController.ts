import { Review } from '../models/index.js';
import { ApiError } from '../middleware/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { reviewInputSchema } from '../validation/schemas.js';
import { publicIdForUrl, releaseUnusedImages } from '../services/mediaService.js';
import type { AuthRequest } from '../middleware/auth.js';

/** GET /api/admin/reviews — all reviews incl. pending/hidden. */
export const listAdminReviews = asyncHandler(async (_req: AuthRequest, res) => {
  const reviews = await Review.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
  res.json({ reviews });
});

/** POST /api/admin/reviews — create a review. */
export const createReview = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = reviewInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const review = await Review.create({
    ...parsed.data,
    imagePublicId: (await publicIdForUrl(parsed.data.image)) ?? '',
  });
  res.status(201).json({ review });
});

/** PUT /api/admin/reviews/:id — update a review. */
export const updateReview = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = reviewInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }

  const existing = await Review.findById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Review not found');
  }

  const previousImage = existing.image;
  existing.set({
    ...parsed.data,
    imagePublicId: (await publicIdForUrl(parsed.data.image)) ?? '',
  });
  const review = await existing.save();

  if (previousImage && previousImage !== review.image) {
    await releaseUnusedImages([previousImage]);
  }
  res.json({ review });
});

/** DELETE /api/admin/reviews/:id — delete a review. */
export const deleteReview = asyncHandler(async (req: AuthRequest, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  if (review.image) {
    await releaseUnusedImages([review.image]);
  }
  res.json({ ok: true });
});

/** POST /api/admin/reviews/:id/status — approve or hide a review. */
export const setReviewStatus = asyncHandler(async (req: AuthRequest, res) => {
  const status = req.body?.status;
  if (!['pending', 'approved', 'hidden'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  if (!review) {
    throw new ApiError(404, 'Review not found');
  }
  res.json({ review });
});
