import type { CartItem, PublicSettings } from '@/types';

/**
 * WhatsApp ordering (PRD §10). Message templates come from SiteSettings so the
 * owner can edit them without code changes. We only substitute placeholders:
 *   {{ITEMS}}, {{TOTAL}}          — multi-product template
 *   {{PRODUCT}}, {{PRICE}}, {{VARIANT_LINE}}, {{QTY_LINE}} — single-product template
 */

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return '[Price on request]';
  return `₹${value.toLocaleString('en-IN')}`;
}

function formatItemLine(item: CartItem): string {
  const variant = item.variantName ? ` — ${item.variantName}` : '';
  return `${item.quantity} × ${item.name}${variant} — ${formatPrice(item.unitPrice)}`;
}

/** Builds the multi-product cart message from the editable template. */
export function buildCartMessage(settings: PublicSettings, items: CartItem[]): string {
  const template = settings.whatsappTemplate || '';
  const lines = items.map((item, i) => `${i + 1}. ${formatItemLine(item)}`).join('\n');

  const priced = items.filter((i) => i.unitPrice !== null);
  const total = priced.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0);
  const hasUnpriced = priced.length !== items.length;

  const totalLine = items.length
    ? hasUnpriced
      ? `${formatPrice(total)} + items pending price confirmation`
      : formatPrice(total)
    : formatPrice(null);

  return template
    .replaceAll('{{ITEMS}}', lines || '(no items)')
    .replaceAll('{{TOTAL}}', totalLine);
}

/** Builds the single-product "Order Now" message from the editable template. */
export function buildSingleProductMessage(
  settings: PublicSettings,
  opts: {
    productName: string;
    variantName: string | null;
    quantity: number;
    price: number | null;
  }
): string {
  const template = settings.whatsappSingleProductTemplate || '';
  return template
    .replaceAll('{{PRODUCT}}', opts.productName)
    .replaceAll('{{PRICE}}', formatPrice(opts.price))
    .replaceAll('{{VARIANT_LINE}}', opts.variantName ? `Variant: ${opts.variantName}\n` : '')
    .replaceAll('{{QTY_LINE}}', opts.quantity > 1 ? `Quantity: ${opts.quantity}\n` : '');
}

/** Validates and normalizes a WhatsApp number to digits-only international form. */
export function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits;
}

/**
 * Returns a wa.me deep link, or null when the business number is not
 * configured yet (admin must set it in Admin → Settings).
 */
export function buildWhatsAppLink(settings: PublicSettings, message: string): string | null {
  const number = normalizeWhatsAppNumber(settings.whatsappNumber ?? '');
  if (!number) return null;
  const text = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${text}`;
}
