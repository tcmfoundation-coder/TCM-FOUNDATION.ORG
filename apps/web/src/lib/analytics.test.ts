import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revokeAnalyticsConsentSignal, trackEvent } from "./analytics";
import { CONSENT_STORAGE_KEY } from "./consent";

/**
 * Regression cover for the leak this gate exists to prevent: gtag stays
 * callable after a visitor withdraws consent, because removing the <Script>
 * does not unload an already-executed script. Gating on "is gtag present"
 * therefore kept sending events. These tests keep gtag deliberately present
 * and vary only the consent record, so a regression to the old check fails
 * here rather than silently shipping.
 */
const sent: unknown[][] = [];
let store: Record<string, string> = {};

beforeEach(() => {
  sent.length = 0;
  store = {};
  vi.stubGlobal("window", {
    // Present in every test — consent, not gtag, must decide.
    gtag: (...args: unknown[]) => sent.push(args),
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("trackEvent", () => {
  it("sends the event once consent is granted", () => {
    store[CONSENT_STORAGE_KEY] = "granted";
    trackEvent("ab_test_cta_click", { test: "hero_cta", variant: "B" });
    expect(sent).toEqual([["event", "ab_test_cta_click", { test: "hero_cta", variant: "B" }]]);
  });

  it("stays silent before a choice is made, even though gtag is loaded", () => {
    trackEvent("newsletter_subscribed");
    expect(sent).toEqual([]);
  });

  it("stays silent after a decline, even though gtag is loaded", () => {
    store[CONSENT_STORAGE_KEY] = "denied";
    trackEvent("newsletter_subscribed");
    expect(sent).toEqual([]);
  });

  it("stops sending as soon as consent is withdrawn mid-session", () => {
    store[CONSENT_STORAGE_KEY] = "granted";
    trackEvent("first");
    delete store[CONSENT_STORAGE_KEY]; // withdrawal
    trackEvent("second");
    expect(sent.map((call) => call[1])).toEqual(["first"]);
  });

  it("does not throw when gtag was never loaded", () => {
    store[CONSENT_STORAGE_KEY] = "granted";
    vi.stubGlobal("window", { localStorage: { getItem: () => "granted" } });
    expect(() => trackEvent("anything")).not.toThrow();
  });
});

describe("revokeAnalyticsConsentSignal", () => {
  it("tells GA to stop using analytics and ad storage", () => {
    revokeAnalyticsConsentSignal();
    expect(sent).toEqual([
      ["consent", "update", { analytics_storage: "denied", ad_storage: "denied" }],
    ]);
  });

  it("is a no-op when GA never loaded", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => null } });
    expect(() => revokeAnalyticsConsentSignal()).not.toThrow();
  });
});
