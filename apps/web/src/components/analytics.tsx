"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "./ui/button";
import { revokeAnalyticsConsentSignal } from "@/lib/analytics";
import {
  CONSENT_CHANGE_EVENT,
  type ConsentState,
  allowsOptionalStorage,
  persistConsent,
  readConsent,
  reconcileConsentCookie,
} from "@/lib/consent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// localStorage as an external store, read via useSyncExternalStore rather
// than "read in an effect, setState" — avoids the extra render pass and
// gives a real, framework-blessed answer to the server/client hydration
// mismatch (getServerSnapshot returns "unknown", matching what SSR renders).
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
  };
}

function getServerSnapshot(): ConsentState {
  return "unknown";
}

/**
 * Simple accept/decline consent banner, not a full CMP — matches the plan's
 * Open Question #7 decision (simple banner, not a stricter EU/UK consent
 * manager) for TCM's donor base.
 *
 * The banner is deliberately NOT gated on GA being configured. It governs the
 * A/B experiment cookie as well as GA4, and that experiment runs whether or
 * not an analytics ID is set — gating the banner on GA_MEASUREMENT_ID would
 * leave a visitor with no way to consent, and so silently disable the
 * experiment in any environment without GA.
 */
export function Analytics() {
  const consent = useSyncExternalStore(subscribe, readConsent, getServerSnapshot);
  const router = useRouter();

  // Repairs the localStorage/cookie pair if one was cleared without the other.
  useEffect(() => {
    reconcileConsentCookie();
  }, []);

  function choose(value: "granted" | "denied") {
    // Covers accept-then-decline within one page life, where gtag is already
    // loaded and would otherwise keep running.
    if (value === "denied") revokeAnalyticsConsentSignal();
    persistConsent(value);
    // Re-runs the proxy so a granted choice assigns the A/B variant now, and a
    // declined one takes effect without waiting for the next navigation.
    router.refresh();
  }

  return (
    <>
      {allowsOptionalStorage(consent) && GA_MEASUREMENT_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}

      {consent === "unknown" && (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white px-6 py-4 shadow-lg"
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-stone-600">
              We use analytics and a homepage experiment to understand how visitors use this site. No personal data
              is sold or shared. See our{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-stone-800">
                Privacy Policy
              </a>
              .
            </p>
            <div className="flex shrink-0 gap-3">
              <Button variant="ghost" size="sm" onClick={() => choose("denied")}>
                Decline
              </Button>
              <Button variant="primary" size="sm" onClick={() => choose("granted")}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
