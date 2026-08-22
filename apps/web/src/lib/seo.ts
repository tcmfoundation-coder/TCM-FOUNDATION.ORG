import type { Metadata } from "next";

// Same env var and localhost fallback already used by sitemap.ts,
// robots.ts, and organization-json-ld.ts — one source of truth for the
// site's public base URL, not a parallel config mechanism.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SITE_NAME = "TCM Foundation";

export interface SeoImage {
  url: string;
  alt: string;
}

interface BuildMetadataInput {
  title: string;
  description: string;
  /** Path only, e.g. "/programs/flagship-program" — SITE_URL is prepended. */
  path: string;
  image?: SeoImage | null;
  type?: "website" | "article";
  /** True for the homepage only — skips the root layout's "%s | TCM Foundation"
   * title template so the tab doesn't read "TCM Foundation | TCM Foundation". */
  absoluteTitle?: boolean;
}

// Every page's Open Graph object is self-contained (title/description/url/
// siteName/type) rather than relying on Next.js to merge it with a parent
// layout's openGraph — Next replaces the whole `openGraph` key per route
// segment rather than deep-merging it, so a partial parent value wouldn't
// actually reach the page.
export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  absoluteTitle = false,
}: BuildMetadataInput): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      locale: "en_US",
      ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}),
    },
  };
}
