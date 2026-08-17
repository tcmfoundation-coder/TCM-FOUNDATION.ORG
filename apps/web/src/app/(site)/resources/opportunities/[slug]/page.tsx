import type { Metadata } from "next";
import { getOpportunityBySlug } from "@/lib/api/opportunities";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "@/components/ui/external-link";
import { buttonStyles } from "@/components/ui/button";

export async function generateMetadata({ params }: PageProps<"/resources/opportunities/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const opportunity = await fetchOrNotFound(() => getOpportunityBySlug(slug));
  return { title: opportunity.title, description: opportunity.description };
}

export default async function OpportunityPage({ params }: PageProps<"/resources/opportunities/[slug]">) {
  const { slug } = await params;
  const opportunity = await fetchOrNotFound(() => getOpportunityBySlug(slug));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Breadcrumbs
        items={[
          { label: "Resources", href: "/resources" },
          { label: "Opportunities Desk", href: "/resources/opportunities" },
          { label: opportunity.title },
        ]}
      />
      <Badge tone="brand">{opportunity.type}</Badge>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        {opportunity.title}
      </h1>
      {opportunity.deadline && (
        <p className="mt-3 text-sm text-stone-500">
          Deadline: {new Date(opportunity.deadline).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </p>
      )}
      <p className="mt-6 text-lg leading-relaxed text-stone-600">{opportunity.description}</p>

      <div className="mt-10">
        <ExternalLink
          href={opportunity.externalApplyUrl}
          showIcon={false}
          className={buttonStyles({ variant: "primary" })}
        >
          Apply on External Site
        </ExternalLink>
      </div>
    </main>
  );
}
