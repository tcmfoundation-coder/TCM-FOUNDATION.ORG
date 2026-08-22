"use client";

import { useRouter } from "next/navigation";
import { clearConsent } from "@/lib/consent";
import { revokeAnalyticsConsentSignal } from "@/lib/analytics";

/**
 * Withdrawal, as the privacy policy promises. Clearing the consent record
 * puts the state back to "unknown", which re-shows the banner and stops
 * optional storage until the visitor chooses again.
 *
 * It clears the consent record only. The A/B cookie is httpOnly so it cannot
 * be deleted from here — `proxy.ts` removes it on the request triggered by the
 * refresh below. Authentication cookies are httpOnly too and are never named
 * by this path, so withdrawing does not sign an editor out of the CMS.
 *
 * A button rather than a link because it performs an action instead of
 * navigating; it sits in the footer's existing legal nav so there is no second
 * persistent banner.
 */
export function CookieSettingsLink({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        // Order matters: signal GA before clearing, while the consent
        // record still explains why. Both are no-ops if GA never loaded.
        revokeAnalyticsConsentSignal();
        clearConsent();
        router.refresh();
      }}
      className={className}
    >
      Cookie Settings
    </button>
  );
}
