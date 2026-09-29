// Shared client-side types. Kept in sync with server/src/models manually —
// both sides validate via zod at the boundary.

export type StockStatus = 'in_stock' | 'out_of_stock';

export interface ProductVariant {
  name: string;
  price: number | null;
  stockStatus: StockStatus;
}

export interface CategoryRef {
  _id?: string;
  name: string;
  slug: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number | null;
  compareAtPrice: number | null;
  size: string;
  category: CategoryRef | null;
  images: string[];
  ingredients: string[];
  benefits: string[];
  howToUse: string;
  warnings: string;
  variants: ProductVariant[];
  stockStatus: StockStatus;
  bestseller: boolean;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  displayOrder: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Review {
  _id: string;
  customerName: string;
  rating: number;
  text: string;
  image: string;
  status: ReviewStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryItem {
  _id: string;
  image: string;
  caption: string;
  externalUrl: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AnalyticsEventType =
  | 'page_view'
  | 'product_view'
  | 'whatsapp_click'
  | 'cart_add'
  | 'order_whatsapp_click';

export interface PublicSettings {
  businessName: string;
  whatsappNumber: string;
  instagramUrl: string;
  email: string;
  mapsUrl: string;
  whatsappTemplate: string;
  whatsappSingleProductTemplate: string;
  hero: { headline: string; subheadline: string; imageUrl: string };
  about: { intro: string; story: string; founderImageUrl: string };
  announcements: { enabled: boolean; text: string };
}

export interface AdminSettings extends PublicSettings {
  updatedAt: string;
}

export interface AnalyticsSummary {
  range: { days: number; since: string };
  totals: {
    events: number;
    pageViews: number;
    productViews: number;
    whatsappClicks: number;
    cartAdds: number;
    orderWhatsappClicks: number;
  };
  topProducts: Array<{ _id: string; name?: string; exists?: boolean; count: number }>;
  topPaths: Array<{ _id: string; count: number }>;
  topReferrers: Array<{ _id: string; count: number }>;
  productCount: number;
}

// ── Cart types ──────────────────────────────────────────────────

export interface CartItem {
  /** productId + '|' + variantName (or 'default') */
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  /** null = price on request */
  unitPrice: number | null;
  variantName: string | null;
  quantity: number;
  maxQuantity: number;
}
