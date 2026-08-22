import type { MetadataRoute } from "next";
import { listPrograms } from "@/lib/api/programs";
import { listBlogPosts } from "@/lib/api/blog";
import { listArticles } from "@/lib/api/articles";
import { listSpotlights } from "@/lib/api/spotlights";
import { listOpportunities } from "@/lib/api/opportunities";
import { listDownloads } from "@/lib/api/downloads";

// Same reasoning as (site)/layout.tsx: this route fetches live CMS slugs,
// so it must not be generated once at build time.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATIC_ROUTES = [
  "",
  "/about",
  "/programs",
  "/resources",
  "/resources/blog",
  "/resources/spotlights",
  "/resources/articles",
  "/resources/downloads",
  "/resources/opportunities",
  "/get-involved",
  "/contact",
  "/support-lab",
  "/call-for-applications",
  "/search",
  "/privacy",
  "/terms",
  "/accessibility",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [programs, blogPosts, articles, spotlights, opportunities, downloads] = await Promise.all([
    listPrograms(),
    listBlogPosts(),
    listArticles(),
    listSpotlights(),
    listOpportunities(),
    listDownloads(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
  }));

  const dynamicEntries: MetadataRoute.Sitemap = [
    ...(Array.isArray(programs) ? programs : programs?.items || []).map((p) => ({ url: `${SITE_URL}/programs/${p.slug}` })),
    ...(Array.isArray(blogPosts) ? blogPosts : blogPosts?.items || []).map((p) => ({ url: `${SITE_URL}/resources/blog/${p.slug}` })),
    ...(Array.isArray(articles) ? articles : articles?.items || []).map((p) => ({ url: `${SITE_URL}/resources/articles/${p.slug}` })),
    ...(Array.isArray(spotlights) ? spotlights : spotlights?.items || []).map((p) => ({ url: `${SITE_URL}/resources/spotlights/${p.slug}` })),
    ...(Array.isArray(opportunities) ? opportunities : opportunities?.items || []).map((p) => ({ url: `${SITE_URL}/resources/opportunities/${p.slug}` })),
    ...(Array.isArray(downloads) ? downloads : []).map((p) => ({ url: `${SITE_URL}/resources/downloads/${p.slug}` })),
  ];

  return [...staticEntries, ...dynamicEntries];
}
