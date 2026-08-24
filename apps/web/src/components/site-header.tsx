import Link from "next/link";
import { getSiteSettings } from "@/lib/api/site-settings";
import { getSocialLinks } from "@/lib/api/social-links";
import { buttonStyles } from "./ui/button";
import { MobileNav, type NavItem } from "./mobile-nav";
import { SiteNavLinks } from "./site-nav-links";
import { SiteUtilityBar } from "./site-utility-bar";

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
  const [settings, socialLinks] = await Promise.all([getSiteSettings(), getSocialLinks()]);

  // Learning Hub / TCM TV move to the utility bar (see site-utility-bar.tsx)
  // rather than sitting inline with the five core routes — they're external
  // destinations, not site sections, and keeping the primary nav to the core
  // set reads as more deliberate. Mobile has no utility bar, so the mobile
  // panel still carries them to keep every route reachable on every device.
  const externalItems: NavItem[] = [
    ...(settings.learningHubUrl ? [{ href: settings.learningHubUrl, label: "Learning Hub", external: true }] : []),
    ...(settings.tcmTvUrl ? [{ href: settings.tcmTvUrl, label: "TCM TV", external: true }] : []),
  ];
  const mobileNavItems: NavItem[] = [...NAV_ITEMS, ...externalItems];

  return (
    <>
      <SiteUtilityBar settings={settings} socialLinks={socialLinks} />
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

          <SiteNavLinks navItems={NAV_ITEMS} />

          <div className="hidden md:block">
            <Link href="/get-involved#donate" className={buttonStyles({ variant: "primary", size: "sm" })}>
              Donate
            </Link>
          </div>

          <MobileNav navItems={mobileNavItems} donateHref="/get-involved#donate" />
        </div>
      </header>
    </>
  );
}
