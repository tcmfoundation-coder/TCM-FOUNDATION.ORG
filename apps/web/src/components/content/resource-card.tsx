import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import { Badge } from "../ui/badge";

interface ResourceCardImage {
  secureUrl: string;
  altText: string;
}

interface ResourceCardProps {
  href: string;
  title: string;
  excerpt?: string | null;
  date?: string | null;
  category?: string;
  image?: ResourceCardImage | null;
}

// Shared card shape for Blog/Article/Spotlight/Download/Opportunity —
// avoids five near-identical card components for what is visually one
// pattern (design-system rule: don't create multiple card styles without
// a clear UX reason). Full-bleed image with the title/excerpt/CTA overlaid
// directly on it, matching ProgramCard's treatment.
export function ResourceCard({ href, title, excerpt, date, category, image }: ResourceCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
    >
      {image ? (
        <Image
          src={image.secureUrl}
          alt={image.altText}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
      ) : (
        // No cover image uploaded yet — the same brand-gradient fallback
        // used across the homepage rather than a broken/empty box.
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950"
        >
          <ImageIcon className="size-10 text-white/25" />
        </div>
      )}

      {/* Matches ProgramCard: the plateau holds to 42% so the title clears
          4.5:1 on light photos too. See that component for the measurements. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,10,9,0.92)_0%,rgba(12,10,9,0.82)_42%,rgba(12,10,9,0.25)_68%,rgba(12,10,9,0)_100%)]"
      />

      <div className="relative flex flex-col gap-2 p-5 sm:p-6">
        {(category || date) && (
          <div className="flex items-center gap-3">
            {category && <Badge tone="brand">{category}</Badge>}
            {date && (
              <time dateTime={date} className="text-xs text-white/70">
                {new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </time>
            )}
          </div>
        )}
        <h3 className="line-clamp-2 font-display text-lg font-medium text-white md:text-xl">{title}</h3>
        {excerpt && <p className="line-clamp-2 text-sm leading-relaxed text-white/80">{excerpt}</p>}
        <span className="inline-flex w-fit items-center gap-1.5 pt-1 text-sm font-medium text-white">
          Read More
          <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
