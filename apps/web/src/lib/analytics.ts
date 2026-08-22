import { allowsOptionalStorage, readConsent } from "./consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a GA4 event only when the visitor's recorded consent still permits it
 * — a silent no-op otherwise, never throws. Keeps call sites simple:
 * `trackEvent("newsletter_subscribed")` everywhere, no consent-checking
 * boilerplate at each call site.
 *
 * The consent check is deliberately not "is gtag present". Removing the
 * <Script> from React's tree does not unload a script the browser has already
 * executed, so after a visitor withdraws consent `window.gtag` stays callable
 * for the rest of the page's life. Gating on gtag alone therefore kept sending
 * events after withdrawal (observed, not theorised). Consent is the source of
 * truth; gtag being loaded is incidental.
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.gtag) return;
  if (!allowsOptionalStorage(readConsent())) return;
  window.gtag("event", name, params);
}

/**
 * Tells GA itself to stop using storage, for the same reason as above: our own
 * call sites going quiet does not stop gtag's built-in behaviour on a page
 * that is already running. Uses GA's documented consent signal rather than a
 * consent-management library.
 *
 * Safe to call when GA never loaded — it simply does nothing.
 */
export function revokeAnalyticsConsentSignal(): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
  });
}
