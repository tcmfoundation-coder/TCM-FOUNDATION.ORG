import { Mail } from "lucide-react";
import type { SiteSettings } from "@/lib/api/site-settings";
import type { SocialLink } from "@/lib/api/social-links";
import { ExternalLink } from "./ui/external-link";
import { SocialIcon } from "./ui/social-icon";

// A slim identity strip above the main header — the first thing a visitor
// reads, before navigation. Desktop/tablet only (`hidden md:flex`): at
// mobile width there isn't room for a second row without pushing the menu
// button down, and everything shown here (Learning Hub, TCM TV, social
// links) is still reachable from the mobile nav panel or the footer.
//
// Carries Learning Hub / TCM TV rather than the main nav row: those are
// external destinations, not core site sections (see SiteHeader's own
// comment on the approved V1 route set), so surfacing them here instead of
// inline with About/Programs/Contact gives the primary nav a cleaner,
// single-purpose row and gives this bar real function rather than pure
// decoration.
//
// Non-sticky by design — it scrolls away with the page so the sticky main
// header stays exactly as tall as it is today.
export function SiteUtilityBar({
  settings,
  socialLinks,
}: {
  settings: SiteSettings;
  socialLinks: SocialLink[];
}) {
  const externalItems = [
    settings.learningHubUrl ? { href: settings.learningHubUrl, label: "Learning Hub" } : null,
    settings.tcmTvUrl ? { href: settings.tcmTvUrl, label: "TCM TV" } : null,
  ].filter((item): item is { href: string; label: string } => item !== null);

  if (externalItems.length === 0 && socialLinks.length === 0 && !settings.contactEmail) return null;

  return (
    <div className="hidden border-b border-white/10 bg-brand-950 text-white md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-2">
        <nav aria-label="External resources" className="flex items-center gap-5">
          {externalItems.map((item) => (
            <ExternalLink
              key={item.href}
              href={item.href}
              showIcon={false}
              className="text-xs font-medium text-white/70 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {item.label}
            </ExternalLink>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="hidden items-center gap-1.5 rounded-sm text-xs text-white/70 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:flex"
            >
              <Mail aria-hidden="true" className="size-3.5 shrink-0" />
              {settings.contactEmail}
            </a>
          )}
          {socialLinks.length > 0 && (
            <div className="flex items-center">
              {socialLinks.map((link) => (
                <span key={link.platform} className="[&_a]:text-white/70 [&_a:hover]:text-white">
                  <SocialIcon platform={link.platform} url={link.url} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
