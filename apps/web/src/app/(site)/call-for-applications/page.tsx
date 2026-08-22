import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, CalendarClock, ArrowRight } from "lucide-react";
import { listOpenCallsForApplications } from "@/lib/api/call-for-applications";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Call for Applications",
  description:
    "Open application opportunities from TCM Foundation. Each campaign lists its own details and deadline.",
  path: "/call-for-applications",
});

export default async function CallForApplicationsPage() {
  const campaigns = await listOpenCallsForApplications();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="mb-12 flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Get Involved</p>
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
          Call for Applications
        </h1>
        {/* Deliberately true in both states: the previous wording announced
            "active application campaigns" directly above an empty state saying
            there were none. */}
        <p className="max-w-2xl text-stone-600">
          Open application opportunities from TCM Foundation. Each campaign lists its own details and deadline.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No open applications right now"
          description="There are no open application campaigns at the moment. New opportunities appear here when they open."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/call-for-applications/${campaign.slug}`}
              className="group flex flex-col gap-3 rounded-sm border border-stone-200 bg-white p-6 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              {campaign.programType && <Badge tone="brand">{campaign.programType}</Badge>}
              <h2 className="font-display text-xl font-medium text-stone-900">{campaign.title}</h2>
              {campaign.description && (
                <p className="line-clamp-3 text-sm leading-relaxed text-stone-600">{campaign.description}</p>
              )}
              {campaign.closeDate && (
                <p className="flex items-center gap-2 text-xs text-stone-500">
                  <CalendarClock aria-hidden="true" className="size-3.5" />
                  Deadline: {new Date(campaign.closeDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
              <span className="mt-auto inline-flex w-fit items-center gap-1.5 pt-2 text-sm font-medium text-brand-700 group-hover:text-brand-800">
                Apply Now <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
