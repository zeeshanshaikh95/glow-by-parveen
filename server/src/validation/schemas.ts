import { z } from 'zod';

/** Slugifies a name for URL-safe identifiers. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

import { WHATSAPP_TEMPLATE_DEFAULT, WHATSAPP_TEMPLATE_SINGLE_DEFAULT } from '../models/siteSettings.model.js';

const trimmed = z.string().trim();
const nullablePrice = z
  .number()
  .nonnegative()
  .max(10_000_000)
  .nullable()
  .or(z.literal(null));

export const stockStatusSchema = z.enum(['in_stock', 'out_of_stock']);

export const variantSchema = z.object({
  name: trimmed.min(1, 'Variant name is required').max(80),
  price: nullablePrice,
  stockStatus: stockStatusSchema.default('in_stock'),
});

export const productInputSchema = z.object({
  name: trimmed.min(1, 'Product name is required').max(140),
  slug: trimmed
    .max(80)
    .regex(/^[a-z0-9-]*$/, 'Slug may contain lowercase letters, numbers and hyphens only')
    .optional()
    .or(z.literal('')),
  description: z.string().max(6000).default(''),
  price: nullablePrice.default(null),
  compareAtPrice: nullablePrice.default(null),
  size: trimmed.max(120).default(''),
  category: z.string().nullable().default(null),
  images: z.array(z.string().trim().max(500)).max(12).default([]),
  ingredients: z.array(trimmed.max(200)).max(60).default([]),
  benefits: z.array(trimmed.max(300)).max(40).default([]),
  howToUse: z.string().max(3000).default(''),
  warnings: z.string().max(2000).default(''),
  variants: z.array(variantSchema).max(20).default([]),
  stockStatus: stockStatusSchema.default('in_stock'),
  bestseller: z.boolean().default(false),
  featured: z.boolean().default(false),
  seoTitle: trimmed.max(200).default(''),
  seoDescription: trimmed.max(320).default(''),
  displayOrder: z.number().int().min(0).max(100000).default(0),
  archived: z.boolean().default(false),
});

export const categoryInputSchema = z.object({
  name: trimmed.min(1, 'Category name is required').max(120),
  slug: trimmed
    .max(80)
    .regex(/^[a-z0-9-]*$/, 'Slug may contain lowercase letters, numbers and hyphens only')
    .optional()
    .or(z.literal('')),
  description: z.string().max(2000).default(''),
  image: z.string().trim().max(500).default(''),
  displayOrder: z.number().int().min(0).max(100000).default(0),
});

export const reviewInputSchema = z.object({
  customerName: trimmed.min(1, 'Customer name is required').max(120),
  rating: z.number().int().min(1).max(5),
  text: trimmed.min(1, 'Review text is required').max(3000),
  image: z.string().trim().max(500).default(''),
  status: z.enum(['pending', 'approved', 'hidden']).default('pending'),
  displayOrder: z.number().int().min(0).max(100000).default(0),
});

export const galleryItemInputSchema = z.object({
  image: z.string().trim().min(1, 'Image is required').max(500),
  caption: z.string().max(300).default(''),
  externalUrl: z.string().trim().max(500).default(''),
  displayOrder: z.number().int().min(0).max(100000).default(0),
  active: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(200),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(200),
});

export const settingsInputSchema = z.object({
  businessName: trimmed.max(120).default('Glow by Parveen'),
  whatsappNumber: trimmed
    .regex(/^\+?[0-9]{7,15}$/, 'WhatsApp number must be digits, optionally starting with +')
    .or(z.literal(''))
    .default(''),
  instagramUrl: z.union([z.literal(''), z.string().trim().url()]).default(''),
  email: z.union([z.literal(''), z.string().trim().email()]).default(''),
  mapsUrl: z.union([z.literal(''), z.string().trim().url()]).default(''),
  whatsappTemplate: z.string().max(4000).default(WHATSAPP_TEMPLATE_DEFAULT),
  whatsappSingleProductTemplate: z
    .string()
    .max(4000)
    .default(WHATSAPP_TEMPLATE_SINGLE_DEFAULT),
  hero: z
    .object({
      headline: z.string().max(220).default(''),
      subheadline: z.string().max(600).default(''),
      imageUrl: z.string().trim().max(500).default(''),
    })
    .default({ headline: '', subheadline: '', imageUrl: '' }),
  about: z
    .object({
      intro: z.string().max(800).default(''),
      story: z.string().max(8000).default(''),
      founderImageUrl: z.string().trim().max(500).default(''),
    })
    .default({ intro: '', story: '', founderImageUrl: '' }),
  announcements: z
    .object({
      enabled: z.boolean().default(false),
      text: z.string().max(300).default(''),
    })
    .default({ enabled: false, text: '' }),
});

export const analyticsEventSchema = z.object({
  type: z.enum(['page_view', 'product_view', 'whatsapp_click', 'cart_add', 'order_whatsapp_click']),
  productSlug: z.string().trim().max(120).default(''),
  path: z.string().trim().max(500).default(''),
  referrer: z.string().trim().max(500).default(''),
  sessionId: z.string().trim().max(64).default(''),
});

export const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        displayOrder: z.number().int().min(0).max(100000),
      })
    )
    .min(1, 'Provide at least one item')
    .max(500),
});
