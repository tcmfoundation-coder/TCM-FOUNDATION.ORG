"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { Button } from "./ui/button";

const CONSENT_STORAGE_KEY = "tcm-analytics-consent";
const CONSENT_CHANGE_EVENT = "tcm-consent-change";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type Consent = "granted" | "denied" | null;

// localStorage as an external store, read via useSyncExternalStore rather
// than "read in an effect, setState" — avoids the extra render pass and
// gives a real, framework-blessed answer to the server/client hydration
// mismatch (getServerSnapshot returns null, matching what SSR renders).
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
  };
}

function getSnapshot(): Consent {
  const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return stored === "granted" || stored === "denied" ? stored : null;
}

function getServerSnapshot(): Consent {
  return null;
}

function setConsent(value: "granted" | "denied") {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

// Simple accept/decline consent banner, not a full CMP — matches the
// plan's Open Question #7 decision (simple banner, not a stricter EU/UK
// consent manager) for TCM's donor base. GA4 only loads after "Accept".
export function Analytics() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      {consent === "granted" && (
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

      {consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white px-6 py-4 shadow-lg">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-stone-600">
              We use analytics to understand how visitors use this site. No personal data is sold or shared.
            </p>
            <div className="flex shrink-0 gap-3">
              <Button variant="ghost" size="sm" onClick={() => setConsent("denied")}>
                Decline
              </Button>
              <Button variant="primary" size="sm" onClick={() => setConsent("granted")}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
