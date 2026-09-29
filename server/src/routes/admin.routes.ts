import { Router } from 'express';
import { loginLimiter, uploadLimiter } from '../middleware/rateLimiters.js';
import {
  requireAuth,
  requirePasswordChanged,
  type AuthRequest,
} from '../middleware/auth.js';
import { uploadImage, uploadsUrlFor } from '../middleware/upload.js';
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
router.post(
  '/uploads',
  uploadLimiter,
  (req, res, next) => {
    uploadImage(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      throw new ApiError(400, 'No images were uploaded');
    }
    const urls = files.map((f) => uploadsUrlFor(f.filename));
    res.status(201).json({ urls });
  })
);

// ── Analytics ───────────────────────────────────────────────────
router.get('/analytics', getAnalytics);

// ── Settings ────────────────────────────────────────────────────
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;
