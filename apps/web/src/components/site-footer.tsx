import Link from "next/link";
import { CookieSettingsLink } from "./cookie-settings-link";
import { Mail, Phone } from "lucide-react";
import { getSiteSettings } from "@/lib/api/site-settings";
import { getSocialLinks } from "@/lib/api/social-links";
import { ExternalLink } from "./ui/external-link";
import { SocialIcon } from "./ui/social-icon";

// One definition for every navigational footer link. Previously 18 of the 19
// focusable elements down here had no focus-visible style at all, so keyboard
// users lost their place the moment they tabbed into the footer.
const FOOTER_LINK =
  "rounded-sm text-sm text-white/80 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// Donate is TCM's primary fundraising CTA, so it reads a step brighter and
// heavier than its siblings - deliberately still a link, not a button.
const FOOTER_LINK_PRIMARY =
  "rounded-sm text-sm font-medium text-white transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// Matches the eyebrow treatment used across the public site (hero, Impact,
// Call for Applications) instead of being the same 14px as the links beneath
// it, which gave the columns no hierarchy.
const FOOTER_HEADING = "text-xs font-medium uppercase tracking-[0.14em] text-white/50";

const QUICK_LINKS = [
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

const GET_INVOLVED_LINKS = [
  { href: "/get-involved#donate", label: "Donate" },
  { href: "/get-involved#partner", label: "Partner" },
  { href: "/get-involved#volunteer", label: "Volunteer" },
  // Points at the listing rather than a Get Involved anchor: the listing is
  // the page a visitor actually needs, and it stands on its own.
  { href: "/call-for-applications", label: "Call for Applications" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/accessibility", label: "Accessibility" },
];

export async function SiteFooter() {
  const [settings, socialLinks] = await Promise.all([getSiteSettings(), getSocialLinks()]);

  const quickLinks = [
    ...QUICK_LINKS,
    ...(settings.learningHubUrl ? [{ href: settings.learningHubUrl, label: "Learning Hub", external: true }] : []),
    ...(settings.tcmTvUrl ? [{ href: settings.tcmTvUrl, label: "TCM TV", external: true }] : []),
  ];

  return (
    <footer className="mt-auto bg-plum text-plum-foreground">
      {/* Two columns on tablet, four only once there is room: at 768px four
          columns squeezed the Contact column badly. */}
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* No column span on tablet: letting brand fill both columns pushed
            Contact onto an orphan third row. A plain 2x2 packs the four
            columns with no wasted vertical space. */}
        <div className="flex flex-col gap-5">
          {/* self-start is load-bearing: this is a flex column, so without it
              the img stretches to the full column width. The SVG then centres
              its own artwork inside that stretched box, leaving the logo
              floating in the middle above left-aligned text. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static
              brand SVG, no benefit from next/image's raster optimization */}
          <img src="/brand/tcm-logo-white.svg" alt="TCM Foundation" className="h-10 w-auto self-start" />
          {settings.tagline && <p className="max-w-xs text-sm leading-relaxed text-white/70">{settings.tagline}</p>}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-2">
              {socialLinks.map((link) => (
                <span key={link.platform} className="[&_a]:text-white/70 [&_a:hover]:text-white">
                  <SocialIcon platform={link.platform} url={link.url} />
                </span>
              ))}
            </div>
          )}
        </div>

        <nav aria-label="Quick Links" className="flex flex-col items-start gap-2.5">
          <h2 className={FOOTER_HEADING}>Quick Links</h2>
          {quickLinks.map((item) =>
            "external" in item && item.external ? (
              <ExternalLink key={item.href} href={item.href} showIcon={false} className={FOOTER_LINK}>
                {item.label}
              </ExternalLink>
            ) : (
              <Link key={item.href} href={item.href} className={FOOTER_LINK}>
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <nav aria-label="Get Involved" className="flex flex-col items-start gap-2.5">
          <h2 className={FOOTER_HEADING}>Get Involved</h2>
          {GET_INVOLVED_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.label === "Donate" ? FOOTER_LINK_PRIMARY : FOOTER_LINK}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* min-w-0: a grid item defaults to min-width:auto, so without this it
            refuses to shrink below its content and a long admin-entered email
            widens the whole grid past the viewport, making the entire page
            scroll sideways. The address is one unbreakable token, so the text
            also needs an explicit wrapping rule. */}
        <div className="flex min-w-0 flex-col items-start gap-2.5">
          <h2 className={FOOTER_HEADING}>Contact</h2>
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className={`flex items-start gap-2 ${FOOTER_LINK}`}
            >
              <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {/* overflow-wrap:anywhere instead of break-all: it only breaks
                  the address when it genuinely cannot fit, rather than
                  chopping every line mid-word. min-w-0 still prevents the
                  grid item from widening the page. */}
              <span className="min-w-0 [overflow-wrap:anywhere]">{settings.contactEmail}</span>
            </a>
          )}
          {settings.contactPhone && (
            <a
              href={`tel:${settings.contactPhone}`}
              className={`flex items-center gap-2 ${FOOTER_LINK}`}
            >
              <Phone aria-hidden="true" className="size-4 shrink-0" />
              {/* A phone number should never break across lines. */}
              <span className="whitespace-nowrap">{settings.contactPhone}</span>
            </a>
          )}
          {!settings.contactEmail && !settings.contactPhone && (
            <Link href="/contact" className={FOOTER_LINK}>
              Contact us
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-4 px-6 py-6 text-xs text-white/60 md:flex-row">
          <p>&copy; {new Date().getFullYear()} The Corporate Muslimah Foundation</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm py-1.5 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {item.label}
              </Link>
            ))}
            {/* Withdrawing consent is an action, not a page — see
                cookie-settings-link.tsx. Placed here so there is no second
                persistent banner. */}
            <CookieSettingsLink className="rounded-sm py-1.5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />
          </nav>
        </div>
      </div>
    </footer>
  );
}
