import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TcmHubPopup } from "@/components/tcm-hub-popup";

// Public pages render CMS content fetched from the API at request time.
// Forcing dynamic rendering (rather than the default static/ISR prerender)
// means `next build` never needs a live API to succeed, and every visit
// gets the current published content instead of an up-to-60s-stale copy.
export const dynamic = "force-dynamic";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:rounded-sm focus-visible:bg-white focus-visible:px-4 focus-visible:py-2.5 focus-visible:text-sm focus-visible:font-medium focus-visible:text-brand-700 focus-visible:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-700"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <div id="main-content">{children}</div>
      <SiteFooter />
      {/* Renders nothing unless an enabled campaign is configured in
          Admin → Settings → Advanced Configuration. */}
      <TcmHubPopup />
    </>
  );
}
