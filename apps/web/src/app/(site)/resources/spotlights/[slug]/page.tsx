import type { Metadata } from "next";
import { getSpotlightBySlug } from "@/lib/api/spotlights";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { ResourceDetail } from "@/components/content/resource-detail";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/resources/spotlights/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const spotlight = await fetchOrNotFound(() => getSpotlightBySlug(slug));
  return buildMetadata({
    title: spotlight.title,
    description: `Spotlight on ${spotlight.subjectName}`,
    path: `/resources/spotlights/${slug}`,
    image: spotlight.coverImage ? { url: spotlight.coverImage.secureUrl, alt: spotlight.coverImage.altText } : undefined,
    type: "article",
  });
}

export default async function SpotlightPage({ params }: PageProps<"/resources/spotlights/[slug]">) {
  const { slug } = await params;
  const spotlight = await fetchOrNotFound(() => getSpotlightBySlug(slug));

  return (
    <ResourceDetail
      breadcrumbLabel="Spotlights"
      breadcrumbHref="/resources/spotlights"
      title={spotlight.title}
      subtitle={spotlight.subjectName}
      date={spotlight.publishedAt}
      body={spotlight.body}
    />
  );
}
