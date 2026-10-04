import { Router } from 'express';
import { loginLimiter, uploadLimiter } from '../middleware/rateLimiters.js';
import {
  requireAuth,
  requirePasswordChanged,
  type AuthRequest,
} from '../middleware/auth.js';
import {
  assertUploadedImagesValid,
  handleImageUpload,
  MAX_UPLOAD_MB,
  UPLOAD_TYPES_LABEL,
  uploadsUrlFor,
} from '../middleware/upload.js';
import { config, isCloudinaryConfigured } from '../config/env.js';
import { uploadImageBuffer } from '../services/cloudinaryService.js';
import { recordUpload, releaseUnusedImage, urlForPublicId } from '../services/mediaService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/errors.js';
import {
  changePassword,
  login,
  me,
} from '../controllers/adminAuthController.js';
import {
  archiveProduct,
  createProduct,
  deleteProduct,
  getAdminProduct,
  listAdminProducts,
  restoreProduct,
  updateProduct,
} from '../controllers/adminProductController.js';
import {
  createCategory,
  deleteCategory,
  listAdminCategories,
  reorderCategories,
  updateCategory,
} from '../controllers/adminCategoryController.js';
import {
  createReview,
  deleteReview,
  listAdminReviews,
  setReviewStatus,
  updateReview,
} from '../controllers/adminReviewController.js';
import {
  createGalleryItem,
  deleteGalleryItem,
  listAdminGallery,
  updateGalleryItem,
} from '../controllers/adminGalleryController.js';
import { getAnalytics } from '../controllers/adminAnalyticsController.js';
import {
  getAdminSettings,
  updateAdminSettings,
} from '../controllers/adminSettingsController.js';

const router = Router();

// ── Auth ────────────────────────────────────────────────────────
router.post('/auth/login', loginLimiter, login);
router.get('/auth/me', requireAuth, me);
router.put('/auth/password', requireAuth, changePassword);

// Everything below requires a valid admin JWT.
router.use(requireAuth);
// …and a completed first-login password change (me/password above are exempt).
router.use(requirePasswordChanged);

// ── Products ────────────────────────────────────────────────────
router.get('/products', listAdminProducts);
router.get('/products/:id', getAdminProduct);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.post('/products/:id/archive', archiveProduct);
router.post('/products/:id/restore', restoreProduct);

// ── Categories ──────────────────────────────────────────────────
router.get('/categories', listAdminCategories);
router.post('/categories', createCategory);
router.put('/categories/reorder', reorderCategories);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ── Reviews ─────────────────────────────────────────────────────
router.get('/reviews', listAdminReviews);
router.post('/reviews', createReview);
router.put('/reviews/:id', updateReview);
router.delete('/reviews/:id', deleteReview);
router.post('/reviews/:id/status', setReviewStatus);

// ── Gallery ─────────────────────────────────────────────────────
router.get('/gallery', listAdminGallery);
router.post('/gallery', createGalleryItem);
router.put('/gallery/:id', updateGalleryItem);
router.delete('/gallery/:id', deleteGalleryItem);

// ── Uploads ─────────────────────────────────────────────────────
// Admin JWT + completed password change required (mounted above). Files are
// validated here and pushed to Cloudinary with the server-side credentials;
// the browser never sees the API key or secret.
router.post(
  '/uploads',
  uploadLimiter,
  handleImageUpload,
  asyncHandler(async (req: AuthRequest, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) {
      throw new ApiError(400, 'No images were uploaded');
    }

    if (isCloudinaryConfigured) {
      assertUploadedImagesValid(files);

      const images = [];
      try {
        for (const file of files) {
          const uploaded = await uploadImageBuffer(file.buffer, file.originalname);
          images.push(await recordUpload(uploaded, req.admin?.id ?? null));
        }
      } catch (err) {
        // Roll back a partially stored batch so a failed request never leaves
        // orphaned (billable) assets behind. Each rollback is best-effort.
        for (const image of images) {
          try {
            await releaseUnusedImage(image.url);
          } catch {
            /* leave it; the asset is unreferenced and can be cleaned up later */
          }
        }
        throw err;
      }
      // `urls` kept for backward compatibility; `images` carries the public_id.
      res.status(201).json({
        images,
        urls: images.map((image) => image.url),
        provider: 'cloudinary',
        limits: { maxBytes: config.upload.maxBytes, maxFiles: config.upload.maxFiles },
      });
      return;
    }

    // No Cloudinary credentials configured — keep the original disk behaviour.
    const urls = files.map((file) => uploadsUrlFor(file.filename));
    res.status(201).json({
      images: urls.map((url) => ({ url, publicId: '' })),
      urls,
      provider: 'local',
      limits: { maxBytes: config.upload.maxBytes, maxFiles: config.upload.maxFiles },
    });
  })
);

/**
 * Deletes a Cloudinary asset — but only when nothing in the database
 * references it any more. Legacy /uploads files are never touched.
 */
router.delete(
  '/uploads',
  uploadLimiter,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { url?: unknown; publicId?: unknown };
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const publicId = typeof body.publicId === 'string' ? body.publicId.trim() : '';

    if (!url && !publicId) {
      throw new ApiError(400, 'Provide the image url (or publicId) to delete');
    }

    const result = url
      ? await releaseUnusedImage(url)
      : await releaseUnusedImage((await urlForPublicId(publicId)) ?? '');

    if (result.reason === 'still_referenced') {
      throw new ApiError(
        409,
        'This image is still used elsewhere in the catalogue, so it was not deleted.'
      );
    }
    if (result.reason === 'not_a_cloudinary_asset') {
      throw new ApiError(
        400,
        `Only Cloudinary images can be deleted from storage. Local ${config.uploadsUrlPrefix}/ files are left untouched.`
      );
    }
    if (result.reason === 'unable_to_resolve_public_id') {
      throw new ApiError(
        409,
        'Cloudinary public_id could not be resolved for this image, so it was left untouched.'
      );
    }

    res.json({ ok: true, url: result.url, released: result.released, reason: result.reason });
  })
);

// ── Analytics ───────────────────────────────────────────────────
router.get('/analytics', getAnalytics);

// ── Settings ────────────────────────────────────────────────────
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;
