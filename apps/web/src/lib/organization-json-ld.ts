import { getSocialLinks } from "./api/social-links";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Only confirmed facts: the org's own name and URL, its real logo file, and
// social profile URLs actually confirmed and stored in SocialLink — never
// invented claims, stats, or unconfirmed profile URLs.
export async function getOrganizationJsonLd() {
  const socialLinks = await getSocialLinks();

  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "The Corporate Muslimah Foundation",
    alternateName: "TCM Foundation",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/tcm-logo-purple.svg`,
    sameAs: socialLinks.map((link) => link.url),
  };
}
