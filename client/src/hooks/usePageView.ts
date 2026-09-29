import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';

let lastTrackedPath: string | null = null;

/** Tracks a page_view for each route change (excluding admin SPA routes). */
export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    if (lastTrackedPath === location.pathname) return;
    lastTrackedPath = location.pathname;
    trackEvent({ type: 'page_view', path: location.pathname });
  }, [location.pathname]);
}
