import { useSettings } from '@/context/SettingsContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { WhatsAppGlyph } from './ProductCard';

interface Props {
  message: string;
  event?: 'whatsapp_click' | 'order_whatsapp_click';
  productSlug?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Central WhatsApp CTA. Generates the personalized wa.me deep link from the
 * provided message. If the business number is not yet configured (client data
 * pending), the button renders disabled with a hint — never a wrong number.
 */
export function WhatsAppButton({
  message,
  event = 'whatsapp_click',
  productSlug,
  label = 'Order on WhatsApp',
  className = '',
  size = 'md',
}: Props) {
  const { settings, whatsappConfigured } = useSettings();
  const link = whatsappConfigured ? buildWhatsAppLink(settings, message) : null;

  const sizeCls =
    size === 'lg' ? 'px-8 py-4 text-base' : size === 'sm' ? '!px-4 !py-2 text-xs' : '';

  if (!link) {
    return (
      <span
        className={`btn-whatsapp ${sizeCls} cursor-not-allowed opacity-60 ${className}`}
        title="WhatsApp number pending — set it in Admin → Settings"
      >
        <WhatsAppGlyph className="h-5 w-5" />
        {label}
      </span>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent({ type: event, productSlug })}
      className={`btn-whatsapp ${sizeCls} ${className}`}
    >
      <WhatsAppGlyph className="h-5 w-5" />
      {label}
    </a>
  );
}
