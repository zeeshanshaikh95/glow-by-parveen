import { Link } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';
import { WhatsAppGlyph } from '@/components/ProductCard';
import { LOGO_TRANSPARENT } from '@/lib/brand';

export function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="mt-20 border-t border-brand-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <img
            src={LOGO_TRANSPARENT}
            alt="Glow by Parveen"
            width={1080}
            height={1080}
            loading="lazy"
            className="h-24 w-auto object-contain"
          />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            Handcrafted natural & herbal beauty products. Follow along on Instagram or reach us
            directly on WhatsApp — we're happy to help you choose.
          </p>
          {settings.instagramUrl ? (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
              </svg>
              Follow on Instagram
            </a>
          ) : (
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-soft/70">
              [CLIENT DATA REQUIRED] — Instagram link
            </p>
          )}
        </div>

        <nav aria-label="Footer">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/shop" className="text-ink-soft hover:text-brand-700">Shop all products</Link></li>
            <li><Link to="/about" className="text-ink-soft hover:text-brand-700">About</Link></li>
            <li><Link to="/reviews" className="text-ink-soft hover:text-brand-700">Reviews & results</Link></li>
            <li><Link to="/gallery" className="text-ink-soft hover:text-brand-700">Instagram gallery</Link></li>
            <li><Link to="/contact" className="text-ink-soft hover:text-brand-700">Contact</Link></li>
          </ul>
        </nav>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink">Contact</p>
          <ul className="mt-3 space-y-2 text-sm">
            {settings.whatsappNumber ? (
              <li>
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800"
                >
                  <WhatsAppGlyph className="h-4 w-4" /> WhatsApp us
                </a>
              </li>
            ) : (
              <li className="text-xs uppercase tracking-wide text-ink-soft/70">
                [CLIENT DATA REQUIRED] — WhatsApp number
              </li>
            )}
            {settings.email ? (
              <li>
                <a href={`mailto:${settings.email}`} className="text-ink-soft hover:text-brand-700">
                  {settings.email}
                </a>
              </li>
            ) : (
              <li className="text-xs uppercase tracking-wide text-ink-soft/70">
                [CLIENT DATA REQUIRED] — Email
              </li>
            )}
            {settings.mapsUrl ? (
              <li>
                <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-brand-700">
                  Find us on Google Maps
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-100 px-4 py-5 text-center text-xs text-ink-soft/80 sm:px-6">
        <p>
          © {new Date().getFullYear()} Glow by Parveen. All rights reserved.
        </p>
        <p className="mt-1">
          Shipping & return policies: <span className="font-semibold">[CLIENT DATA REQUIRED]</span>
        </p>
        <p className="mt-2">
          <Link
            to="/admin/login"
            className="text-[11px] text-ink-soft/50 underline decoration-transparent underline-offset-2 transition-colors hover:text-ink-soft hover:decoration-current"
          >
            Admin Login
          </Link>
        </p>
      </div>
    </footer>
  );
}
