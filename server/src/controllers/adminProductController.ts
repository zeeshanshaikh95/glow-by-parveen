import { Product } from '../models/index.js';
import { ApiError } from '../middleware/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildProductFilter, parseProductQuery, productSort } from '../utils/query.js';
import { productInputSchema, slugify } from '../validation/schemas.js';
import {
  publicIdsForUrls,
  releaseUnusedImages,
  removedUrls,
} from '../services/mediaService.js';
import type { AuthRequest } from '../middleware/auth.js';

/** GET /api/admin/products — includes archived + out-of-stock, supports filters. */
export const listAdminProducts = asyncHandler(async (req: AuthRequest, res) => {
  const query = parseProductQuery(req.query as Record<string, unknown>);
  query.includeArchived = true;
  query.includeOutOfStock = true;

  const filter = buildProductFilter(query);
  const products = await Product.find(filter).sort(productSort(query.sort)).lean();

  res.json({ products });
});

/** GET /api/admin/products/:id — single product for editing. */
export const getAdminProduct = asyncHandler(async (req: AuthRequest, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.json({ product });
});

/** POST /api/admin/products — create a product. */
export const createProduct = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = productInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  const slug = data.slug || (await generateUniqueSlug(data.name));
  const duplicate = await Product.findOne({ slug }).lean();
  if (duplicate) {
    throw new ApiError(409, 'A product with this slug already exists');
  }

  // Image URLs stay in the existing `images` field; the matching Cloudinary
  // public_ids are resolved server-side and stored alongside them.
  const product = await Product.create({
    ...data,
    slug,
    imagePublicIds: await publicIdsForUrls(data.images),
  });
  res.status(201).json({ product });
});

/** PUT /api/admin/products/:id — update a product. */
export const updateProduct = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = productInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  const existing = await Product.findById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Product not found');
  }

  const slug = data.slug || existing.slug;
  if (slug !== existing.slug) {
    const duplicate = await Product.findOne({ slug, _id: { $ne: existing._id } }).lean();
    if (duplicate) {
      throw new ApiError(409, 'A product with this slug already exists');
    }
  }

  const previousImages = [...(existing.images ?? [])];
  existing.set({ ...data, slug, imagePublicIds: await publicIdsForUrls(data.images) });
  const saved = await existing.save();

  // Replaced images are destroyed only when no document references them any
  // more (see mediaService.findReferences). Failures are logged, never thrown.
  await releaseUnusedImages(removedUrls(previousImages, saved.images ?? []));

  res.json({ product: saved });
});

/** DELETE /api/admin/products/:id — hard delete a product. */
export const deleteProduct = asyncHandler(async (req: AuthRequest, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await releaseUnusedImages(product.images ?? []);
  res.json({ ok: true });
});

/** POST /api/admin/products/:id/archive — archive (soft delete). */
export const archiveProduct = asyncHandler(async (req: AuthRequest, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { archived: true },
    { new: true }
  );
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.json({ product });
});

/** POST /api/admin/products/:id/restore — restore an archived product. */
export const restoreProduct = asyncHandler(async (req: AuthRequest, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { archived: false },
    { new: true }
  );
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.json({ product });
});

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'product';
  let slug = base;
  let i = 2;
  while (await Product.exists({ slug })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
