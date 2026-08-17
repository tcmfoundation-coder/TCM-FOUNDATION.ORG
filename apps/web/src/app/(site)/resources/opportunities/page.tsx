import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { listOpportunities, type OpportunityType } from "@/lib/api/opportunities";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "@/components/ui/external-link";

export const metadata: Metadata = {
  title: "Opportunities Desk",
  description: "Curated grants, scholarships, fellowships, and competitions from TCM Foundation.",
};

const FILTERS: { label: string; value?: OpportunityType }[] = [
  { label: "All" },
  { label: "Career", value: "CAREER" },
  { label: "Business", value: "BUSINESS" },
  { label: "Education", value: "EDUCATION" },
];

export default async function OpportunitiesIndexPage({
  searchParams,
}: PageProps<"/resources/opportunities">) {
  const { type } = await searchParams;
  const selectedType = typeof type === "string" ? (type as OpportunityType) : undefined;
  const opportunities = await listOpportunities(selectedType);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Opportunities Desk" }]} />
      <h1 className="mt-6 mb-6 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        Opportunities Desk
      </h1>

      <div className="mb-10 flex gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `/resources/opportunities?type=${filter.value}` : "/resources/opportunities"}
            className={`rounded-sm px-3.5 py-1.5 text-sm font-medium ${
              selectedType === filter.value
                ? "bg-brand-600 text-white"
                : "border border-stone-200 text-stone-600 hover:border-brand-300"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {opportunities.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No opportunities available right now" />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} className="flex flex-col gap-3 border border-stone-200 p-6">
              <Badge tone="brand">{opportunity.type}</Badge>
              <h2 className="font-display text-lg font-medium text-stone-900">{opportunity.title}</h2>
              <p className="line-clamp-3 text-sm text-stone-600">{opportunity.description}</p>
              {opportunity.deadline && (
                <p className="text-xs text-stone-500">
                  Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
                </p>
              )}
              <ExternalLink
                href={opportunity.externalApplyUrl}
                className="mt-2 w-fit text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Apply
              </ExternalLink>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
