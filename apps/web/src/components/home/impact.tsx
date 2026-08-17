import { TrendingUp } from "lucide-react";
import { listImpactStats } from "@/lib/api/impact-stats";
import { StatCounter } from "../content/stat-counter";
import { EmptyState } from "../ui/empty-state";

export async function Impact() {
  const stats = await listImpactStats();

  return (
    <section className="bg-stone-50 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        {stats.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Impact figures coming soon"
            description="TCM Foundation's impact numbers will be published here once confirmed."
          />
        ) : (
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <StatCounter key={stat.id} value={stat.value} label={stat.label} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
