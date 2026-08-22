"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { FaqAccordion } from "./faq-accordion";
import { Alert } from "../ui/alert";
import { listFaq, type FaqEntry } from "@/lib/api/faq";

const SEARCH_DEBOUNCE_MS = 300;

interface FaqExplorerProps {
  /** Server-fetched, unfiltered FAQ list — used for the first paint and
   * whenever no search/category filter is active, so the FAQ section works
   * without waiting on a client-side round trip. */
  initialItems: FaqEntry[];
}

// Categories come from the real FAQ data already fetched server-side rather
// than a separate endpoint — the set of categories in use is exactly the
// set of distinct, non-null FAQ.category values.
function distinctCategories(items: FaqEntry[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (item.category) set.add(item.category);
  }
  return Array.from(set).sort();
}

export function FaqExplorer({ initialItems }: FaqExplorerProps) {
  const categories = useMemo(() => distinctCategories(initialItems), [initialItems]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  // Only populated by a filtered fetch — while no filter is active,
  // `displayedItems` below reads `initialItems` directly instead, so this
  // effect never needs to reset state back on the "no filter" branch.
  const [fetchedItems, setFetchedItems] = useState<FaqEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const hasActiveFilter = search.trim() !== "" || category !== "";
  const displayedItems = hasActiveFilter ? (fetchedItems ?? []) : initialItems;

  useEffect(() => {
    if (!hasActiveFilter) return;

    const currentRequest = ++requestId.current;

    // setLoading(true) happens inside this callback (invoked from
    // setTimeout below), not synchronously in the effect body — the effect
    // body itself only schedules the timer.
    async function runFilteredFetch() {
      setLoading(true);
      try {
        const results = await listFaq({
          search: search.trim() || undefined,
          category: category || undefined,
        });
        if (requestId.current === currentRequest) {
          setFetchedItems(results);
          setError(null);
        }
      } catch {
        if (requestId.current === currentRequest) {
          setError("Couldn't load FAQs right now. Please try again.");
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(runFilteredFetch, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search, category, hasActiveFilter]);

  function clearFilters() {
    setSearch("");
    setCategory("");
    setError(null);
    setFetchedItems(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search FAQs..."
          aria-label="Search FAQs"
          className="w-full rounded-sm border border-stone-300 py-2.5 pl-10 pr-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
        />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory("")}
            aria-pressed={category === ""}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium ${
              category === "" ? "bg-brand-600 text-white" : "border border-stone-200 text-stone-600 hover:border-brand-300"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium ${
                category === cat ? "bg-brand-600 text-white" : "border border-stone-200 text-stone-600 hover:border-brand-300"
              }`}
            >
              {cat}
            </button>
          ))}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
            >
              <X aria-hidden="true" className="size-3.5" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <div aria-live="polite" aria-busy={loading} className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {displayedItems.length === 0 && !error && !loading ? (
          <p className="rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
            {hasActiveFilter ? "No FAQs match your search." : "Frequently asked questions will be published here."}
          </p>
        ) : (
          <FaqAccordion items={displayedItems} />
        )}
      </div>
    </div>
  );
}
