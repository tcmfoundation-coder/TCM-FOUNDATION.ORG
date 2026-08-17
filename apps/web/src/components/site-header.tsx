import Link from "next/link";
import { getSiteSettings } from "@/lib/api/site-settings";
import { buttonStyles } from "./ui/button";
import { ExternalLink } from "./ui/external-link";
import { MobileNav, type NavItem } from "./mobile-nav";

// Matches the approved V1 route set (see plan section 6) — "Events" and
// "Learning Hub" from the design brief map onto Programs and a conditional
// promo link respectively, not new top-level routes.
const NAV_ITEMS: NavItem[] = [
  { href: "/about", label: "About Us" },
  { href: "/programs", label: "Programs" },
  { href: "/resources", label: "Resources" },
  { href: "/get-involved", label: "Get Involved" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const settings = await getSiteSettings();

  const navItems: NavItem[] = [
    ...NAV_ITEMS,
    ...(settings.learningHubUrl ? [{ href: settings.learningHubUrl, label: "Learning Hub", external: true }] : []),
    ...(settings.tcmTvUrl ? [{ href: settings.tcmTvUrl, label: "TCM TV", external: true }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static
              brand SVG, no benefit from next/image's raster optimization */}
          <img
            src="/brand/tcm-logo-purple.svg"
            alt="TCM Foundation — The Corporate Muslimah Foundation"
            className="h-9 w-auto"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {navItems.map((item) =>
            item.external ? (
              <ExternalLink
                key={item.href}
                href={item.href}
                showIcon={false}
                className="text-sm text-stone-700 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                {item.label}
              </ExternalLink>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-stone-700 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden md:block">
          <Link href="/get-involved#donate" className={buttonStyles({ variant: "primary", size: "sm" })}>
            Donate
          </Link>
        </div>

        <MobileNav navItems={navItems} donateHref="/get-involved#donate" />
      </div>
    </header>
  );
}
