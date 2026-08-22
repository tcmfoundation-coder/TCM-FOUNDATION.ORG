import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { listSpotlights } from "@/lib/api/spotlights";
import { ResourceCard } from "@/components/content/resource-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Spotlights",
  description: "Features on inspiring Muslim women breaking barriers, from TCM Foundation.",
  path: "/resources/spotlights",
});

export default async function SpotlightsIndexPage() {
  const response = await listSpotlights();
  const spotlights = Array.isArray(response) ? response : response?.items || [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Spotlights" }]} />
      <h1 className="mt-6 mb-12 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        Spotlights
      </h1>

      {spotlights.length === 0 ? (
        <EmptyState icon={Sparkles} title="Spotlight stories coming soon" />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {spotlights.map((spotlight) => (
            <ResourceCard
              key={spotlight.id}
              href={`/resources/spotlights/${spotlight.slug}`}
              title={spotlight.title}
              excerpt={spotlight.subjectName}
              date={spotlight.publishedAt}
              image={spotlight.coverImage}
            />
          ))}
        </div>
      )}
    </main>
  );
}
