import { TrendingUp } from "lucide-react";
import { listImpactStats } from "@/lib/api/impact-stats";
import { StatCounter } from "../content/stat-counter";
import { EmptyState } from "../ui/empty-state";

/**
 * Figures and their labels are the client's own — nothing here is generated,
 * reworded, or annotated. The labels already carry the human meaning ("Women
 * Reached", "Mentorship Hours"), so the work was to stop presenting them as a
 * dense four-up grid and let them breathe instead.
 *
 * The eyebrow line is framing, not a claim: it says what the reader is looking
 * at without asserting anything TCM has not stated.
 */
export async function Impact() {
  const stats = await listImpactStats();

  return (
    <section className="bg-stone-50 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        {stats.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Impact figures coming soon"
            description="TCM Foundation's impact numbers will be published here once confirmed."
          />
        ) : (
          <>
            <p className="mb-12 text-xs font-medium uppercase tracking-[0.14em] text-brand-700 md:mb-16">
              What this community has built together
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 md:gap-x-10">
              {stats.map((stat) => (
                <StatCounter key={stat.id} value={stat.value} label={stat.label} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
