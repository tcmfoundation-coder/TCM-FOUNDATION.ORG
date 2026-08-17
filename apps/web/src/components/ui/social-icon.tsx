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
      className="text-stone-500 transition-colors hover:text-brand-700"
    >
      <Icon aria-hidden="true" className="size-5" />
    </ExternalLink>
  );
}
