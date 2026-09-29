import { Router } from 'express';
import {
  getCategoryBySlug,
  getPublicSettings,
  getProductBySlug,
  getRelatedProducts,
  listCategories,
  listGallery,
  listProducts,
  listReviews,
  recordAnalyticsEvent,
} from '../controllers/publicController.js';
import { analyticsLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.get('/products', listProducts);
router.get('/products/:slug', getProductBySlug);
router.get('/products/:slug/related', getRelatedProducts);

router.get('/categories', listCategories);
router.get('/categories/:slug', getCategoryBySlug);

router.get('/reviews', listReviews);
router.get('/gallery', listGallery);
router.get('/settings', getPublicSettings);

router.post('/analytics/events', analyticsLimiter, recordAnalyticsEvent);

export default router;
