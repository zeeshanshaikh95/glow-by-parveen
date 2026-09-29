import { Suspense, useEffect, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SettingsProvider } from '@/context/SettingsContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MiniCart } from '@/components/MiniCart';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { ProductPage } from '@/pages/ProductPage';
import { AboutPage } from '@/pages/AboutPage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { ContactPage } from '@/pages/ContactPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { usePageView } from '@/hooks/usePageView';

// Admin bundle is code-split and lazy-loaded (PRD §17).
const AdminApp = lazy(() => import('@/admin/AdminApp'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function SiteChrome({ children }: { children: React.ReactNode }) {
  usePageView();
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <MiniCart />
      <WhatsAppFloat />
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 24 24" className="h-10 w-10 animate-spin text-brand-500" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" opacity="0.25" />
          <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
        </svg>
        <span className="text-sm text-ink-soft">Loading…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ToastProvider>
          <CartProvider>
            <ScrollToTop />
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Public site */}
                <Route path="/" element={<SiteChrome><HomePage /></SiteChrome>} />
                <Route path="/shop" element={<SiteChrome><ShopPage /></SiteChrome>} />
                <Route path="/category/:slug" element={<SiteChrome><CategoryPage /></SiteChrome>} />
                <Route path="/product/:slug" element={<SiteChrome><ProductPage /></SiteChrome>} />
                <Route path="/about" element={<SiteChrome><AboutPage /></SiteChrome>} />
                <Route path="/reviews" element={<SiteChrome><ReviewsPage /></SiteChrome>} />
                <Route path="/gallery" element={<SiteChrome><GalleryPage /></SiteChrome>} />
                <Route path="/contact" element={<SiteChrome><ContactPage /></SiteChrome>} />

                {/* Admin (lazy, no site chrome) */}
                <Route path="/admin/*" element={<AdminApp />} />

                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="*" element={<SiteChrome><NotFoundPage /></SiteChrome>} />
              </Routes>
            </Suspense>
          </CartProvider>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
