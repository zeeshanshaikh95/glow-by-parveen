import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'M4 13h6V4H4v9zm10 7h6v-9h-6v9zM4 20h6v-5H4v5zM14 4v5h6V4h-6z' },
  { to: '/admin/products', label: 'Products', icon: 'M4 7l8-4 8 4v10l-8 4-8-4V7zm8 12V11m8-4l-8 4-8-4' },
  { to: '/admin/categories', label: 'Categories', icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/admin/reviews', label: 'Reviews', icon: 'M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9L12 3z' },
  { to: '/admin/gallery', label: 'Gallery', icon: 'M4 6h16v12H4V6zm2 10l4-5 3 3 3-4 4 6H6z' },
  { to: '/admin/settings', label: 'Settings', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zm8 4l2 1-2 3-2-.6a7 7 0 01-1.5 1L16 19h-4l-.5-2.6a7 7 0 01-1.5-1L8 16l-2-3 2-1v-.1L6 11l2-3 2 .6a7 7 0 011.5-1L12 5h4l.5 2.6a7 7 0 011.5 1L20 8l2 3-2 1z' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function onLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-ink-soft hover:bg-stone-100 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Toggle sidebar"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
            <Link to="/admin/dashboard" className="font-display text-base font-bold text-ink">
              Glow Admin
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              className="hidden rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-stone-100 sm:block"
            >
              View site ↗
            </Link>
            <span className="hidden text-xs text-ink-soft md:block">{admin?.email}</span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 mt-14 w-56 transform border-r border-stone-200 bg-white transition-transform lg:static lg:mt-0 lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="space-y-1 p-3" aria-label="Admin">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:bg-stone-50 hover:text-ink'
                  }`
                }
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {open ? (
          <div className="fixed inset-0 z-20 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
        ) : null}

        {/* Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
