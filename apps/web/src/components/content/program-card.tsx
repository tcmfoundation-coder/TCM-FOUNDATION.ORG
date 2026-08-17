import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Program } from "@/lib/api/programs";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <article className="flex flex-col gap-3 border border-stone-200 p-6">
      <h3 className="font-display text-xl font-medium text-stone-900">{program.title}</h3>
      <p className="line-clamp-3 text-sm text-stone-600">{program.description}</p>
      <Link
        href={`/programs/${program.slug}`}
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        Learn More <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </article>
  );
}
