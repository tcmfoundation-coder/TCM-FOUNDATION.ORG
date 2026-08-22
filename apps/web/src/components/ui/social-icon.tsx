import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { ExternalLink } from "./external-link";

const PLATFORM_ICONS: Record<string, IconType> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  linkedin: FaLinkedin,
  youtube: FaYoutube,
  x: FaXTwitter,
  twitter: FaXTwitter,
  tiktok: FaTiktok,
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  twitter: "X",
  tiktok: "TikTok",
};

export function SocialIcon({ platform, url }: { platform: string; url: string }) {
  const key = platform.toLowerCase();
  const Icon = PLATFORM_ICONS[key];
  if (!Icon) return null;

  return (
    <ExternalLink
      href={url}
      showIcon={false}
      aria-label={`TCM Foundation on ${PLATFORM_LABELS[key] ?? platform} (opens in a new tab)`}
      // The icon is 20px, which left the whole link a 20x20 target - under the
      // 24px WCAG 2.2 minimum and awkward on a phone. Padding grows the hit
      // area to 36px without changing how large the icon looks. `-m-2` keeps
      // the row's visual spacing exactly as it was.
      className="-m-2 rounded-sm p-2 text-stone-500 transition-colors hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      <Icon aria-hidden="true" className="size-5" />
    </ExternalLink>
  );
}
