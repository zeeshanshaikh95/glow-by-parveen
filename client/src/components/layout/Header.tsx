import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();
  const { settings } = useSettings();
  const location = useLocation();

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-cream/90 backdrop-blur">
      {settings.announcements.enabled && settings.announcements.text ? (
        <div className="bg-brand-600 px-4 py-1.5 text-center text-xs font-medium text-white">
          {settings.announcements.text}
        </div>
      ) : null}

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Glow by Parveen home">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="10" r="3" />
              <path d="M12 13c0 4-2.5 5-2.5 8M12 13c0 4 2.5 5 2.5 8M9.2 8.5C7.5 9 6.5 10.5 6.5 12M14.8 8.5c1.7.5 2.7 2 2.7 3.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            Glow <span className="font-medium text-brand-600">by Parveen</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-100 text-brand-800' : 'text-ink-soft hover:bg-brand-50 hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <a
            href={`https://instagram.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full p-2 text-ink-soft hover:bg-brand-50 hover:text-brand-700 sm:block"
            aria-label="Instagram"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>

          <button
            type="button"
            onClick={openCart}
            className="relative rounded-full p-2 text-ink hover:bg-brand-50"
            aria-label={`Open cart (${count} items)`}
          >
            <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8h12l-1.2 12H7.2L6 8zM9 8a3 3 0 016 0" strokeLinecap="round" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-2 text-ink hover:bg-brand-50 md:hidden"
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-brand-100 bg-white px-4 pb-4 pt-2 md:hidden" aria-label="Mobile">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-medium ${
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
