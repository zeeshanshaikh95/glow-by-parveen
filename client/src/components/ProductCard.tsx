import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { buildSingleProductMessage, buildWhatsAppLink } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { formatPrice, truncate } from '@/lib/format';
import { PlaceholderImage } from './PlaceholderImage';
import type { Product } from '@/types';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const { addItem } = useCart();
  const { settings, whatsappConfigured } = useSettings();
  const outOfStock = product.stockStatus === 'out_of_stock';

  const waLink = whatsappConfigured
    ? buildWhatsAppLink(
        settings,
        buildSingleProductMessage(settings, {
          productName: product.name,
          variantName: product.variants[0]?.name ?? null,
          quantity: 1,
          price: product.price,
        })
      )
    : null;

  return (
    <article className="card group relative flex flex-col overflow-hidden transition-shadow hover:shadow-soft">
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-brand-50"
        aria-label={`View ${product.name}`}
      >
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <PlaceholderImage seed={product.slug} />
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.bestseller && <span className="badge-pink">Bestseller</span>}
          {product.featured && <span className="badge-leaf">Featured</span>}
          {outOfStock && <span className="badge-stone">Out of stock</span>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={`/product/${product.slug}`} className="focus-visible:rounded">
          <h3 className="font-display text-lg font-semibold leading-snug text-ink hover:text-brand-700">
            {truncate(product.name, 64)}
          </h3>
        </Link>

        {product.size ? (
          <p className="text-xs text-ink-soft">{product.size}</p>
        ) : null}

        <p className="text-base font-semibold text-brand-700">{formatPrice(product.price)}</p>

        <div className="mt-auto flex gap-2 pt-2">
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => addItem(product)}
            className="btn-outline flex-1 !px-3 !py-2 text-xs"
          >
            Add to Cart
          </button>
          {waLink && !outOfStock ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent({ type: 'whatsapp_click', productSlug: product.slug })}
              className="btn-whatsapp !px-3 !py-2 text-xs"
              aria-label={`Order ${product.name} on WhatsApp`}
            >
              <WhatsAppGlyph className="h-4 w-4" />
              Order
            </a>
          ) : (
            <Link to={`/product/${product.slug}`} className="btn-ghost !px-3 !py-2 text-xs">
              Details
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function WhatsAppGlyph({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.2L2 22l4.9-1.6A9.9 9.9 0 1 0 12.04 2zm0 18.1a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.9 1 1-2.9-.2-.3a8.2 8.2 0 1 1 6.6 3.6zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4 0-.5.1-.7l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.2 2.1-.7 3.4.6 1.7 2 3.3 3.6 4.2 1.7.9 2.9 1.1 3.9.8.6-.2 1.4-.7 1.6-1.3.2-.5.2-1 .1-1.1 0-.1-.2-.2-.4-.3z" />
    </svg>
  );
}
