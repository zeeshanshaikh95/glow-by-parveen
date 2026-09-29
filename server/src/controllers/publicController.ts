import { Types } from 'mongoose';
import {
  AnalyticsEvent,
  Category,
  GalleryItem,
  Product,
  Review,
} from '../models/index.js';
import { getSiteSettings } from '../services/settingsService.js';
import { ApiError } from '../middleware/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  buildProductFilter,
  parseProductQuery,
  productSort,
} from '../utils/query.js';
import { analyticsEventSchema } from '../validation/schemas.js';

/** GET /api/products — public catalogue with search, category, sort filters. */
export const listProducts = asyncHandler(async (req, res) => {
  const query = parseProductQuery(req.query as Record<string, unknown>);

  // Accept either a category slug or a category id for friendlier linking.
  let categoryFilter = query.category;
  if (query.category && !/^[a-f\d]{24}$/i.test(query.category)) {
    const cat = await Category.findOne({ slug: query.category }).select('_id').lean();
    categoryFilter = cat ? String(cat._id) : 'none';
  }

  const filter = buildProductFilter({ ...query, category: categoryFilter });
  const products = await Product.find(filter).sort(productSort(query.sort)).lean();

  res.json({ products });
});

/** GET /api/products/:slug — single active product by slug. */
export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const product = await Product.findOne({ slug, archived: false })
    .populate('category', 'name slug')
    .lean();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.json({ product });
});

/** GET /api/products/:slug/related — related products in the same category. */
export const getRelatedProducts = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const product = await Product.findOne({ slug, archived: false }).lean();

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const related = await Product.find({
    _id: { $ne: product._id },
    archived: false,
    stockStatus: 'in_stock',
    ...(product.category ? { category: product.category } : {}),
  })
    .sort({ bestseller: -1, featured: -1, displayOrder: 1, createdAt: -1 })
    .limit(4)
    .lean();

  res.json({ products: related });
});

/** GET /api/categories — public category list, ordered for display. */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ displayOrder: 1, name: 1 }).lean();
  res.json({ categories });
});

/** GET /api/categories/:slug — one category plus its visible products. */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const category = await Category.findOne({ slug }).lean();

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const products = await Product.find({
    category: category._id,
    archived: false,
    stockStatus: 'in_stock',
  })
    .sort({ bestseller: -1, featured: -1, displayOrder: 1, createdAt: -1 })
    .lean();

  res.json({ category, products });
});

/** GET /api/reviews — approved reviews for the public site. */
export const listReviews = asyncHandler(async (_req, res) => {
  const reviews = await Review.find({ status: 'approved' })
    .sort({ displayOrder: 1, createdAt: -1 })
    .lean();
  res.json({ reviews });
});

/** GET /api/gallery — active gallery items, ordered. */
export const listGallery = asyncHandler(async (_req, res) => {
  const items = await GalleryItem.find({ active: true })
    .sort({ displayOrder: 1, createdAt: -1 })
    .lean();
  res.json({ items });
});

/** GET /api/settings — public site settings (never includes secrets). */
export const getPublicSettings = asyncHandler(async (_req, res) => {
  const s = await getSiteSettings();
  res.json({
    settings: {
      businessName: s.businessName,
      whatsappNumber: s.whatsappNumber,
      instagramUrl: s.instagramUrl,
      email: s.email,
      mapsUrl: s.mapsUrl,
      whatsappTemplate: s.whatsappTemplate,
      whatsappSingleProductTemplate: s.whatsappSingleProductTemplate,
      hero: s.hero,
      about: s.about,
      announcements: s.announcements,
    },
  });
});

/** POST /api/analytics/events — records a lightweight, privacy-conscious event. */
export const recordAnalyticsEvent = asyncHandler(async (req, res) => {
  const parsed = analyticsEventSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid analytics event');
  }

  const { type, productSlug, path, referrer, sessionId } = parsed.data;

  // Resolve slug → id so analytics can join against products; unknown slugs are ignored.
  let productId: Types.ObjectId | null = null;
  if (productSlug) {
    const prod = await Product.findOne({ slug: productSlug }).select('_id').lean();
    if (prod) productId = prod._id as Types.ObjectId;
  }

  await AnalyticsEvent.create({
    type,
    productId,
    productSlug,
    path,
    referrer,
    sessionId,
  });

  res.status(202).json({ ok: true });
});
