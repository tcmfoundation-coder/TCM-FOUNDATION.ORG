import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Headline/eyebrow/CTA copy is the client's own direction from the design
// brief, used verbatim. The explanatory body paragraph is organizational
// content (mission/vision/history) TCM hasn't supplied yet — shown as a
// clearly labeled placeholder rather than invented copy.
export function Mission() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Our Mission</p>
          <h2 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">
            Building a future where every Muslim woman can thrive.
          </h2>
        </div>
        <div className="flex flex-col gap-4">
          <p className="rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-500">
            TCM Foundation&apos;s full mission, vision, and history are being finalized and will appear here.
          </p>
          <Link
            href="/about"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Our Story <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
