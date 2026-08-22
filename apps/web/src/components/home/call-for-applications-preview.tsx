import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { listOpenCallsForApplications } from "@/lib/api/call-for-applications";
import { Badge } from "../ui/badge";

// The homepage shows at most this many; the section links to the full listing
// whenever there is more than one open campaign, so nothing is hidden.
const HOMEPAGE_LIMIT = 3;

/**
 * Renders nothing at all when no campaign is open.
 *
 * `GET /call-for-applications` is hard-filtered to `status: 'OPEN'` server-side
 * (call-for-applications.service.ts `listPublic`), so a non-empty response is
 * exactly the condition for showing this — no client-side status filtering, and
 * no separate endpoint.
 *
 * Every word below the heading comes from campaign data. There is deliberately
 * no supporting paragraph: describing what these opportunities offer would be
 * an organizational claim TCM has not made, and the campaigns describe
 * themselves. The section earns its place by being real and current, not by
 * being sold.
 *
 * Campaigns carry no image field, so this uses the bordered card treatment from
 * the listing page rather than the full-bleed photo cards used for programs and
 * resources. Nothing is invented to fill the gap.
 */
export async function CallForApplicationsPreview() {
  const campaigns = await listOpenCallsForApplications();
  if (campaigns.length === 0) return null;

  const shown = campaigns.slice(0, HOMEPAGE_LIMIT);
  const hasMore = campaigns.length > 1;

  return (
    <section className="bg-stone-50 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">Call for Applications</p>
          <h2 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">
            Opportunities to Apply
          </h2>
        </div>

        <ul className="grid list-none gap-6 p-0 md:grid-cols-3">
          {shown.map((campaign) => (
            <li key={campaign.id} className="flex">
              {/* One link per card: the whole card is the target, so each card
                  is a single tab stop with the title in its accessible name. */}
              <Link
                href={`/call-for-applications/${campaign.slug}`}
                className="group flex w-full flex-col gap-3 rounded-sm border border-stone-200 bg-white p-6 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                {campaign.programType && (
                  <span className="w-fit">
                    <Badge tone="brand">{campaign.programType}</Badge>
                  </span>
                )}

                <h3 className="font-display text-xl font-medium text-stone-900">{campaign.title}</h3>

                {campaign.description && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-stone-600">{campaign.description}</p>
                )}

                {campaign.closeDate && (
                  <p className="flex items-center gap-2 text-xs text-stone-600">
                    <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
                    {/* Text, never an image, and carrying its own label so it
                        still reads as a deadline out of visual context. */}
                    <span>
                      Deadline:{" "}
                      <time dateTime={campaign.closeDate}>
                        {new Date(campaign.closeDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </span>
                  </p>
                )}

                <span className="mt-auto inline-flex w-fit items-center gap-1.5 pt-2 text-sm font-medium text-brand-700 group-hover:text-brand-800">
                  Apply Now
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {hasMore && (
          <div className="mt-10">
            <Link
              href="/call-for-applications"
              className="group inline-flex w-fit items-center gap-1.5 rounded-sm py-1 text-sm font-medium text-brand-700 hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              View All Applications
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
