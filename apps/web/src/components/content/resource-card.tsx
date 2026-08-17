import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "../ui/badge";

interface ResourceCardProps {
  href: string;
  title: string;
  excerpt?: string | null;
  date?: string | null;
  category?: string;
}

// Shared card shape for Blog/Article/Spotlight/Download/Opportunity —
// avoids five near-identical card components for what is visually one
// pattern (design-system rule: don't create multiple card styles without
// a clear UX reason).
export function ResourceCard({ href, title, excerpt, date, category }: ResourceCardProps) {
  return (
    <article className="flex flex-col gap-3 border border-stone-200 p-6">
      <div className="flex items-center gap-3">
        {category && <Badge tone="brand">{category}</Badge>}
        {date && (
          <time dateTime={date} className="text-xs text-stone-500">
            {new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </time>
        )}
      </div>
      <h3 className="font-display text-lg font-medium text-stone-900">{title}</h3>
      {excerpt && <p className="line-clamp-3 text-sm text-stone-600">{excerpt}</p>}
      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        Read More <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </article>
  );
}
