import type { Partner } from "@/lib/api/partners";
import { ExternalLink } from "../ui/external-link";

// Cloudinary isn't configured yet, so partner logo images aren't available —
// a text treatment of the partner name is the honest stand-in rather than a
// broken <img>, and gets swapped for the real mark once media is wired up.
export function PartnerLogo({ partner }: { partner: Partner }) {
  const content = (
    <span className="flex h-16 items-center justify-center border border-stone-200 px-6 text-sm font-medium text-stone-500 grayscale transition-colors hover:text-stone-800 hover:grayscale-0">
      {partner.name}
    </span>
  );

  if (partner.websiteUrl) {
    return (
      <ExternalLink href={partner.websiteUrl} showIcon={false} aria-label={`${partner.name} (opens in a new tab)`}>
        {content}
      </ExternalLink>
    );
  }

  return content;
}
