import { useSettings } from '@/context/SettingsContext';
import { useCart } from '@/context/CartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { WhatsAppGlyph } from '@/components/ProductCard';

/**
 * Persistent floating WhatsApp CTA (PRD §15) — sits bottom-right, does not
 * obstruct content, hidden while the mini-cart is open.
 */
export function WhatsAppFloat() {
  const { settings, whatsappConfigured } = useSettings();
  const { isOpen } = useCart();

  if (!whatsappConfigured || isOpen) return null;

  const link = buildWhatsAppLink(
    settings,
    'Hi Glow by Parveen! 🌸 I have a question about your products.'
  );
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent({ type: 'whatsapp_click' })}
      className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-soft transition-transform hover:scale-105 active:scale-95"
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppGlyph className="h-7 w-7" />
    </a>
  );
}
