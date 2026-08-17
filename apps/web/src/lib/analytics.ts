declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Fires a GA4 event only if analytics has actually loaded (consent granted
// + gtag script present) — a silent no-op otherwise, never throws. Keeps
// call sites simple: `trackEvent("newsletter_subscribed")` everywhere,
// no consent-checking boilerplate at each call site.
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}
