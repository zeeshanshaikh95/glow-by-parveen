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
  /**
   * Out-of-stock products stay VISIBLE by default (PRD §8: they may remain
   * listed but cannot be ordered — the UI disables ordering for them).
   * Pass onlyInStock=true to hide them entirely.
   */
  includeOutOfStock: boolean;
}

export function parseProductQuery(q: Record<string, unknown>): ProductQuery {
  const sortParam = String(q.sort ?? 'featured');
  return {
    search: String(q.search ?? '').trim().slice(0, 100),
    category: String(q.category ?? '').trim().slice(0, 100),
    sort: (PRODUCT_SORTS as string[]).includes(sortParam)
      ? (sortParam as ProductSort)
      : 'featured',
    includeArchived: q.includeArchived === 'true',
    includeOutOfStock: q.onlyInStock !== 'true',
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

// "in_stock" sorts before "out_of_stock" alphabetically, so listing it first
// keeps available products above unavailable ones.
const SORT_MAP: Record<ProductSort, Record<string, 1 | -1>> = {
  featured: { stockStatus: 1, featured: -1, displayOrder: 1, createdAt: -1 },
  bestseller: { stockStatus: 1, bestseller: -1, displayOrder: 1, createdAt: -1 },
  price_asc: { price: 1, stockStatus: 1, displayOrder: 1 },
  price_desc: { price: -1, stockStatus: 1, displayOrder: 1 },
  newest: { stockStatus: 1, createdAt: -1 },
};

export function productSort(sort: ProductSort): Record<string, 1 | -1> {
  return SORT_MAP[sort];
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
