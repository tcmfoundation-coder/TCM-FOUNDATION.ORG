import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { search } from "@/lib/api/search";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Search",
  description: "Search TCM Foundation's programs, resources, and opportunities.",
};

const TYPE_PATHS: Record<string, string> = {
  program: "/programs",
  blog: "/resources/blog",
  article: "/resources/articles",
  spotlight: "/resources/spotlights",
  opportunity: "/resources/opportunities",
};

const TYPE_LABELS: Record<string, string> = {
  program: "Program",
  blog: "Blog",
  article: "Article",
  spotlight: "Spotlight",
  opportunity: "Opportunity",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = query ? await search(query) : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">Search</h1>

      <form method="GET" className="mt-8 flex gap-2">
        <label htmlFor="search-input" className="sr-only">
          Search
        </label>
        <div className="relative flex-1">
          <SearchIcon aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            id="search-input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search programs, resources, and opportunities"
            className="w-full rounded-sm border border-stone-300 py-2.5 pl-10 pr-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
          />
        </div>
        <button
          type="submit"
          className="rounded-sm bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      <div className="mt-10">
        {!query ? null : results.length === 0 ? (
          <EmptyState icon={SearchIcon} title={`No results for "${query}"`} description="Try a different search term." />
        ) : (
          <ul className="flex flex-col divide-y divide-stone-200 border-y border-stone-200">
            {results.map((result) => (
              <li key={`${result.type}-${result.slug}`} className="py-4">
                <Link href={`${TYPE_PATHS[result.type]}/${result.slug}`} className="group flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-brand-700">
                    {TYPE_LABELS[result.type]}
                  </span>
                  <span className="font-medium text-stone-900 group-hover:text-brand-700">{result.title}</span>
                  {result.excerpt && <span className="line-clamp-1 text-sm text-stone-600">{result.excerpt}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
