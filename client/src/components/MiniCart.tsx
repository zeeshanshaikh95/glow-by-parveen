import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { buildCartMessage, buildWhatsAppLink } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { formatPrice } from '@/lib/format';
import { PlaceholderImage } from './PlaceholderImage';
import { WhatsAppGlyph } from './ProductCard';

/**
 * Mini-cart slide-over (PRD §11). Personalized multi-product WhatsApp message
 * is generated from the editable template in Settings.
 */
export function MiniCart() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    count,
  } = useCart();
  const { settings, whatsappConfigured } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close + focus management for accessibility.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const message = buildCartMessage(settings, items);
  const waLink = whatsappConfigured ? buildWhatsAppLink(settings, message) : null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div
        className="absolute inset-0 bg-ink/40 animate-fade-in"
        onClick={closeCart}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right outline-none"
      >
        <header className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
          <h2 className="font-display text-xl font-semibold">
            Your Cart {count > 0 && <span className="text-brand-600">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-full p-2 text-ink-soft hover:bg-brand-50"
            aria-label="Close cart"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <svg viewBox="0 0 48 48" className="h-14 w-14 text-brand-200" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 16h20l-2 20H16l-2-20zM20 16a4 4 0 018 0" strokeLinecap="round" />
            </svg>
            <p className="font-display text-lg font-semibold text-ink">Your cart is empty</p>
            <p className="text-sm text-ink-soft">Add products to order them together on WhatsApp.</p>
            <button type="button" onClick={closeCart} className="btn-primary mt-2">
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-brand-100 overflow-y-auto scrollbar-thin px-5">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 py-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <PlaceholderImage seed={item.slug} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="text-sm font-semibold text-ink hover:text-brand-700"
                    >
                      {item.name}
                    </Link>
                    {item.variantName ? (
                      <p className="mt-0.5 text-xs text-ink-soft">Variant: {item.variantName}</p>
                    ) : null}
                    <p className="mt-0.5 text-sm font-semibold text-brand-700">
                      {formatPrice(item.unitPrice)}
                    </p>
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <div className="flex items-center rounded-full border border-brand-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="px-2.5 py-1 text-ink-soft hover:text-brand-700"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-semibold" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="px-2.5 py-1 text-ink-soft hover:text-brand-700"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="ml-auto text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="space-y-3 border-t border-brand-100 bg-blush/60 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">Estimated subtotal</span>
                <span className="text-lg font-bold text-ink">
                  {subtotal === null ? 'Pending confirmation' : formatPrice(subtotal)}
                </span>
              </div>
              {subtotal === null ? (
                <p className="text-xs text-ink-soft">
                  Some items need price confirmation — final totals are shared on WhatsApp.
                </p>
              ) : null}

              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackEvent({ type: 'order_whatsapp_click' });
                  }}
                  className="btn-whatsapp w-full !py-3.5"
                >
                  <WhatsAppGlyph />
                  Order on WhatsApp
                </a>
              ) : (
                <span className="btn-whatsapp w-full !py-3.5 cursor-not-allowed opacity-60" title="WhatsApp number pending — set it in Admin → Settings">
                  <WhatsAppGlyph />
                  Order on WhatsApp
                </span>
              )}

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={clearCart}
                  className="font-medium text-red-500 hover:text-red-700"
                >
                  Clear cart
                </button>
                <button type="button" onClick={closeCart} className="font-medium text-brand-700 hover:text-brand-800">
                  Continue shopping
                </button>
              </div>
              <p className="text-center text-[11px] leading-relaxed text-ink-soft">
                Ordering is completed on WhatsApp — availability, delivery and payment are
                confirmed by the business there.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
