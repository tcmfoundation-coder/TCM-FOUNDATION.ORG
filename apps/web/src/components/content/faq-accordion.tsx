import { ChevronDown, HelpCircle } from "lucide-react";
import type { FaqEntry } from "@/lib/api/faq";
import { EmptyState } from "../ui/empty-state";

// Native <details>/<summary> gives correct keyboard support, screen-reader
// semantics, and open/close behavior for free — no hand-rolled ARIA needed.
export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="FAQ coming soon"
        description="Frequently asked questions will be published here."
      />
    );
  }

  return (
    <div className="flex flex-col divide-y divide-stone-200 border-y border-stone-200">
      {items.map((item) => (
        <details key={item.id} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900 marker:content-none">
            {item.question}
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-stone-400 group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm text-stone-600">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
