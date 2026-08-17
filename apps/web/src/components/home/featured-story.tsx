import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { listSpotlights } from "@/lib/api/spotlights";
import { EmptyState } from "../ui/empty-state";

export async function FeaturedStory() {
  const [story] = await listSpotlights(1);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      {!story ? (
        <EmptyState
          icon={Sparkles}
          title="Spotlight stories coming soon"
          description="Features on inspiring Muslim women will appear here once published."
        />
      ) : (
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div aria-hidden="true" className="aspect-[4/3] bg-gradient-to-br from-brand-100 to-brand-300 md:order-2" />
          <div className="flex flex-col gap-4 md:order-1">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Spotlight</p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">
              {story.title}
            </h2>
            <p className="line-clamp-4 text-stone-600">{story.body}</p>
            <Link
              href={`/resources/spotlights/${story.slug}`}
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Read Story <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
