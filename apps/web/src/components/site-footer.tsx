import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { getSiteSettings } from "@/lib/api/site-settings";
import { getSocialLinks } from "@/lib/api/social-links";
import { ExternalLink } from "./ui/external-link";
import { SocialIcon } from "./ui/social-icon";

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
  ];

  return (
    <footer className="mt-auto bg-plum text-plum-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="flex flex-col gap-4 md:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- static
              brand SVG, no benefit from next/image's raster optimization */}
          <img src="/brand/tcm-logo-white.svg" alt="TCM Foundation" className="h-8 w-auto" />
          {settings.tagline && <p className="text-sm text-white/70">{settings.tagline}</p>}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-4 pt-2">
              {socialLinks.map((link) => (
                <span key={link.platform} className="[&_a]:text-white/70 [&_a:hover]:text-white">
                  <SocialIcon platform={link.platform} url={link.url} />
                </span>
              ))}
            </div>
          )}
        </div>

        <nav aria-label="Quick Links" className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">Quick Links</h2>
          {quickLinks.map((item) =>
            "external" in item && item.external ? (
              <ExternalLink key={item.href} href={item.href} showIcon={false} className="text-sm text-white/80 hover:text-white">
                {item.label}
              </ExternalLink>
            ) : (
              <Link key={item.href} href={item.href} className="text-sm text-white/80 hover:text-white">
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <nav aria-label="Get Involved" className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">Get Involved</h2>
          {GET_INVOLVED_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-white/80 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-white/50">Contact</h2>
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              <Mail aria-hidden="true" className="size-4" />
              {settings.contactEmail}
            </a>
          )}
          {settings.contactPhone && (
            <a
              href={`tel:${settings.contactPhone}`}
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              <Phone aria-hidden="true" className="size-4" />
              {settings.contactPhone}
            </a>
          )}
          {!settings.contactEmail && !settings.contactPhone && (
            <Link href="/contact" className="text-sm text-white/80 hover:text-white">
              Contact us
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-4 px-6 py-6 text-xs text-white/60 md:flex-row">
          <p>&copy; {new Date().getFullYear()} The Corporate Muslimah Foundation</p>
          <nav aria-label="Legal" className="flex gap-5">
            {LEGAL_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
