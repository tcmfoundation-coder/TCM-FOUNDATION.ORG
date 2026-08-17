import type { Metadata } from "next";
import { getSpotlightBySlug } from "@/lib/api/spotlights";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { ResourceDetail } from "@/components/content/resource-detail";

export async function generateMetadata({ params }: PageProps<"/resources/spotlights/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const spotlight = await fetchOrNotFound(() => getSpotlightBySlug(slug));
  return { title: spotlight.title, description: `Spotlight on ${spotlight.subjectName}` };
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
