import type { FilterQuery } from 'mongoose';
import { Product, type IProduct } from '../models/index.js';

export type ProductSort = 'featured' | 'bestseller' | 'price_asc' | 'price_desc' | 'newest';

export const PRODUCT_SORTS: ProductSort[] = [
  'featured',
  'bestseller',
  'price_asc',
  'price_desc',
  'newest',
];

export interface ProductQuery {
  search: string;
  category: string;
  sort: ProductSort;
  includeArchived: boolean;
  includeOutOfStock: boolean;
}

const ARCHIVED_NOTE =
  'Archived products are excluded from all public listings and only visible to admins.';

export function parseProductQuery(q: Record<string, unknown>): ProductQuery {
  const sortParam = String(q.sort ?? 'featured');
  return {
    search: String(q.search ?? '').trim().slice(0, 100),
    category: String(q.category ?? '').trim().slice(0, 100),
    sort: (PRODUCT_SORTS as string[]).includes(sortParam)
      ? (sortParam as ProductSort)
      : 'featured',
    includeArchived: q.includeArchived === 'true',
    includeOutOfStock: q.includeOutOfStock === 'true',
  };
}

export function buildProductFilter(query: ProductQuery): FilterQuery<IProduct> {
  const filter: FilterQuery<IProduct> = {};

  if (!query.includeArchived) filter.archived = false;
  if (!query.includeOutOfStock) filter.stockStatus = 'in_stock';

  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }

  if (query.category) {
    filter.category = query.category;
  }

  return filter;
}

const SORT_MAP: Record<ProductSort, Record<string, 1 | -1>> = {
  featured: { featured: -1, displayOrder: 1, createdAt: -1 },
  bestseller: { bestseller: -1, displayOrder: 1, createdAt: -1 },
  price_asc: { price: 1, displayOrder: 1 },
  price_desc: { price: -1, displayOrder: 1 },
  newest: { createdAt: -1 },
};

export function productSort(sort: ProductSort): Record<string, 1 | -1> {
  return SORT_MAP[sort];
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
