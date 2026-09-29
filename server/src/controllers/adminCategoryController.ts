import { Category, Product } from '../models/index.js';
import { ApiError } from '../middleware/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { categoryInputSchema, slugify } from '../validation/schemas.js';
import type { AuthRequest } from '../middleware/auth.js';

/** GET /api/admin/categories — all categories for management. */
export const listAdminCategories = asyncHandler(async (_req: AuthRequest, res) => {
  const categories = await Category.find().sort({ displayOrder: 1, name: 1 }).lean();
  res.json({ categories });
});

/** POST /api/admin/categories — create a category. */
export const createCategory = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = categoryInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  const slug = data.slug || slugify(data.name);
  if (!slug) {
    throw new ApiError(400, 'Could not generate a valid slug from the name');
  }
  const duplicate = await Category.findOne({ slug }).lean();
  if (duplicate) {
    throw new ApiError(409, 'A category with this slug already exists');
  }

  const category = await Category.create({ ...data, slug });
  res.status(201).json({ category });
});

/** PUT /api/admin/categories/:id — update a category. */
export const updateCategory = asyncHandler(async (req: AuthRequest, res) => {
  const parsed = categoryInputSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, 'Validation failed', parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  const existing = await Category.findById(req.params.id);
  if (!existing) {
    throw new ApiError(404, 'Category not found');
  }

  const slug = data.slug || existing.slug;
  if (slug !== existing.slug) {
    if (!slug) {
      throw new ApiError(400, 'Slug cannot be empty');
    }
    const duplicate = await Category.findOne({ slug, _id: { $ne: existing._id } }).lean();
    if (duplicate) {
      throw new ApiError(409, 'A category with this slug already exists');
    }
  }

  existing.set({ ...data, slug });
  const saved = await existing.save();
  res.json({ category: saved });
});

/**
 * DELETE /api/admin/categories/:id — delete a category.
 * Products in this category are detached (category set to null), never deleted.
 */
export const deleteCategory = asyncHandler(async (req: AuthRequest, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  await Product.updateMany({ category: category._id }, { $set: { category: null } });
  await category.deleteOne();

  res.json({ ok: true });
});

/** PUT /api/admin/categories/reorder — batch update display order. */
export const reorderCategories = asyncHandler(async (req: AuthRequest, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items || !items.length) {
    throw new ApiError(400, 'items[] with { id, displayOrder } is required');
  }

  const ops = items
    .filter(
      (it: { id?: unknown; displayOrder?: unknown }) =>
        typeof it?.id === 'string' && typeof it?.displayOrder === 'number'
    )
    .map((it: { id: string; displayOrder: number }) => ({
      updateOne: {
        filter: { _id: it.id },
        update: { $set: { displayOrder: it.displayOrder } },
      },
    }));

  if (ops.length) {
    await Category.bulkWrite(ops);
  }
  res.json({ ok: true });
});
