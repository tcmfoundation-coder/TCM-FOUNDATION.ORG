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

/**
 * Serializes JSON-LD for injection into a <script> block.
 *
 * `JSON.stringify` escapes quotes but NOT `<`, so a string containing
 * `</script>` would close the block early and everything after it would be
 * parsed as HTML. `sameAs` carries CMS-managed social URLs, which makes this
 * a real sink for stored input rather than a hypothetical one.
 *
 * The API's `@IsUrl` validator happens to reject the characters needed for
 * that today, but a sink should not depend on an upstream validator's
 * incidental strictness. Escaping the three characters that can break out of
 * a script context makes it safe regardless. They stay valid JSON — `<`
 * parses back to `<` — so consumers see the original values.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
