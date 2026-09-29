import type { TrackPayload } from '@/api/endpoints';
import { API_BASE } from '@/api/client';

const SESSION_KEY = 'gbp_sid';

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'anonymous';
  }
}

/**
 * Fire-and-forget analytics event. Failures are intentionally swallowed —
 * tracking must never break the shopping experience.
 */
export function trackEvent(event: TrackPayload): void {
  const payload: TrackPayload = {
    ...event,
    path: event.path ?? window.location.pathname,
    referrer: event.referrer ?? (document.referrer || undefined),
    sessionId: getSessionId(),
  };

  try {
    const body = JSON.stringify(payload);
    const endpoint = `${API_BASE}/api/analytics/events`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // no-op
  }
}
