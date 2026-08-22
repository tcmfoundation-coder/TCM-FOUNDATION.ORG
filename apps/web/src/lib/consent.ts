/**
 * One consent mechanism, readable from both sides of the app.
 *
 * The visitor's choice is stored twice on purpose, and both writes happen in
 * the same function so they cannot drift:
 *
 *   - localStorage  — what the banner UI reads. Already the existing store;
 *                     kept so an existing visitor's choice survives.
 *   - a cookie      — what `proxy.ts` reads. The proxy runs on the server and
 *                     cannot see localStorage, so without this mirror the
 *                     server could not know whether it is allowed to assign
 *                     the A/B cookie.
 *
 * This is a mirror of one decision, not a second consent mechanism: nothing
 * writes one without the other, and `reconcileConsentCookie` repairs the pair
 * if a visitor clears cookies but not localStorage.
 *
 * The consent cookie records the visitor's own choice and is what lets the
 * site honour "declined" — it is required for the consent mechanism itself to
 * work, so it is not gated behind consent.
 */

export type ConsentState = "granted" | "denied" | "unknown";

/** Existing key — unchanged, so choices already made are still honoured. */
export const CONSENT_STORAGE_KEY = "tcm-analytics-consent";
export const CONSENT_COOKIE_NAME = "tcm-consent";
export const CONSENT_CHANGE_EVENT = "tcm-consent-change";

export const AB_COOKIE_NAME = "ab-hero-cta";
export const AB_COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const CONSENT_COOKIE_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

/** Anything that is not an explicit choice is "unknown" — never a default yes. */
export function parseConsent(value: string | null | undefined): ConsentState {
  return value === "granted" || value === "denied" ? value : "unknown";
}

/**
 * The single rule the rest of the app asks about. Only an explicit "granted"
 * permits optional storage — "unknown" and "denied" both mean no.
 */
export function allowsOptionalStorage(state: ConsentState): boolean {
  return state === "granted";
}

// ---------------------------------------------------------------------------
// Browser-only helpers. Every DOM/storage access sits inside a function body
// so this module stays safe to import from `proxy.ts`, which runs on the
// server and must not touch `window`.
// ---------------------------------------------------------------------------

/** localStorage throws outright in blocked-storage/private modes, not just returns null. */
function safeReadStorage(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeConsentCookie(value: ConsentState) {
  // Not httpOnly: the client is the writer here, and a consent choice carries
  // nothing sensitive. `secure` mirrors the app's other cookies.
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (value === "unknown") {
    document.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
    return;
  }
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Max-Age=${CONSENT_COOKIE_TTL_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

export function readConsent(): ConsentState {
  return parseConsent(safeReadStorage());
}

/** Records an explicit choice in both stores and notifies listeners. */
export function persistConsent(value: "granted" | "denied") {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage blocked — the cookie mirror below still carries the choice.
  }
  writeConsentCookie(value);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/**
 * Withdrawal. Clears only the consent record — the A/B cookie is httpOnly and
 * therefore cannot be removed from here, so `proxy.ts` deletes it on the next
 * request once it sees consent is gone. Authentication cookies are never
 * touched: they are httpOnly too, and nothing here names them.
 */
export function clearConsent() {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Nothing to clear if storage was blocked.
  }
  writeConsentCookie("unknown");
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/**
 * Keeps the two stores in step. A visitor who clears cookies but keeps
 * localStorage would otherwise appear "granted" to the banner while appearing
 * "unknown" to the proxy — so the banner would stay hidden while the A/B
 * cookie was never assigned.
 */
export function reconcileConsentCookie() {
  const stored = readConsent();
  const inCookie = parseConsent(
    document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
      ?.split("=")[1],
  );
  if (stored !== inCookie) writeConsentCookie(stored);
  return { stored, inCookie, repaired: stored !== inCookie };
}
