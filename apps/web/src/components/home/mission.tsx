import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listPrograms } from "@/lib/api/programs";

/**
 * Headline/eyebrow/CTA copy is the client's own direction from the design
 * brief, used verbatim. The explanatory body paragraph is organizational
 * content (mission/vision/history) TCM hasn't supplied yet — still shown as a
 * clearly labelled placeholder rather than invented copy.
 *
 * The warmth here comes from a real photograph of TCM's own community rather
 * than from writing something the client has not said. When the mission text
 * arrives it drops into the same slot; nothing about the layout assumes the
 * placeholder.
 */
export async function Mission() {
  // Real TCM photography already in the CMS. Falls back to the geometric motif
  // if none has been uploaded, so the section never depends on it.
  const programs = await listPrograms({ take: 10 });
  const image =
    programs.items.flatMap((program) => program.galleryMedia)[0] ??
    programs.items.find((program) => program.heroImage)?.heroImage ??
    null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">Our Mission</p>
          <h2 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">
            Building a future where every Muslim woman can thrive.
          </h2>
          <p className="rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-500">
            TCM Foundation&apos;s full mission, vision, and history are being finalized and will appear here.
          </p>
          <Link
            href="/about"
            className="group inline-flex w-fit items-center gap-1.5 rounded-sm py-1 text-sm font-medium text-brand-700 hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            Our Story
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-900">
          {image ? (
            <Image
              src={image.secureUrl}
              alt={image.altText || "TCM Foundation community members at a foundation event"}
              fill
              sizes="(min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
          ) : (
            // Same rub el hizb motif used elsewhere, standing in until real
            // photography is available.
            <svg aria-hidden="true" className="size-full opacity-15">
              <defs>
                <pattern id="mission-star" width="72" height="72" patternUnits="userSpaceOnUse">
                  <g stroke="white" strokeWidth="1" fill="none">
                    <rect x="16" y="16" width="40" height="40" />
                    <rect x="16" y="16" width="40" height="40" transform="rotate(45 36 36)" />
                  </g>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mission-star)" />
            </svg>
          )}
        </div>
      </div>
    </section>
  );
}
