import Image from "next/image";
import type { Partner } from "@/lib/api/partners";
import { ExternalLink } from "../ui/external-link";

/**
 * Partner marks render in their own colours.
 *
 * These are other organisations' brands — desaturating them by default
 * misrepresented the mark and made every logo read as flat black. Hover and
 * focus now add emphasis rather than restoring something that was taken
 * away.
 *
 * The emphasis keys off a NAMED group (`group/logo`). The marquee container
 * in home/partners.tsx already carries a plain `group` for pause-on-hover,
 * and an unnamed `group-hover:` here would match that ancestor too — so
 * pointing anywhere in the strip would emphasise every logo at once. Naming
 * it scopes the effect to the one logo under the pointer.
 *
 * The group is present on both branches because only some partners have a
 * website; without it the unlinked ones would silently get no hover
 * treatment. The global prefers-reduced-motion rule in globals.css
 * neutralises the transition for anyone who asks for that.
 */

const EMPHASIS =
  "transition duration-300 ease-out group-hover/logo:scale-105 group-hover/logo:saturate-150 group-focus-visible/logo:scale-105 group-focus-visible/logo:saturate-150";

export function PartnerLogo({ partner }: { partner: Partner }) {
  const content = partner.logo ? (
    <span className={`relative flex h-16 w-36 items-center justify-center ${EMPHASIS}`}>
      <Image
        src={partner.logo.secureUrl}
        alt={partner.logo.altText || partner.name}
        fill
        sizes="150px"
        className="object-contain"
      />
    </span>
  ) : (
    // No logo uploaded yet — a text treatment of the partner name is the
    // honest stand-in rather than a broken <img>, swapped for the real mark
    // once one is uploaded from the admin.
    <span className="flex h-16 items-center justify-center border border-stone-200 px-6 text-sm font-medium text-stone-500 transition-colors duration-300 group-hover/logo:border-brand-200 group-hover/logo:text-brand-700 group-focus-visible/logo:border-brand-200 group-focus-visible/logo:text-brand-700">
      {partner.name}
    </span>
  );

  if (partner.websiteUrl) {
    return (
      <ExternalLink
        href={partner.websiteUrl}
        showIcon={false}
        aria-label={`${partner.name} (opens in a new tab)`}
        className="group/logo rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
      >
        {content}
      </ExternalLink>
    );
  }

  // Not a link, so it carries the named group itself — without this the
  // emphasis classes above would have nothing to key off.
  return <span className="group/logo">{content}</span>;
}
