import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import type { Program } from "@/lib/api/programs";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <Link
      href={`/programs/${program.slug}`}
      className="group relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
    >
      {program.heroImage ? (
        <Image
          src={program.heroImage.secureUrl}
          alt={program.heroImage.altText}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
      ) : (
        // No hero image uploaded yet — the same brand-gradient treatment
        // used by the Hero's own fallback, not a broken/empty box.
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950"
        >
          <Layers className="size-10 text-white/25" />
        </div>
      )}

      {/* Strongest toward the bottom, where the text sits, fading out toward
          the top so the image/fallback stays visible above it.

          The plateau runs to 42% because that is where the text block actually
          ends — the previous via-50% ramp had already decayed to ~0.5 alpha by
          the time it reached the title, which measured 3.8-4.1:1 on the lighter
          photos (needs 4.5:1 at 20px). Editors choose these images, so the
          scrim has to hold for a bright upload rather than depend on the photo
          happening to be dark. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,10,9,0.92)_0%,rgba(12,10,9,0.82)_42%,rgba(12,10,9,0.25)_68%,rgba(12,10,9,0)_100%)]"
      />

      <div className="relative flex flex-col gap-2 p-5 sm:p-6">
        <h3 className="line-clamp-2 font-display text-lg font-medium text-white md:text-xl">{program.title}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-white/80">{program.description}</p>
        <span className="inline-flex w-fit items-center gap-1.5 pt-1 text-sm font-medium text-white">
          Learn More
          <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
