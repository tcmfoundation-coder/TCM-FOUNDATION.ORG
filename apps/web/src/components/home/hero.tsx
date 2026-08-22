import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { buttonStyles } from "../ui/button";
import { HeroCtaLink } from "./hero-cta-link";

// Real TCM Foundation event photography (community members at a foundation
// event, uploaded to Media as part of the site's real-photo curation) —
// the gradient overlays below are tuned for legibility of the white
// heading/copy/CTAs against this photo rather than for a flat color.
function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-brand-950">
      <Image
        src="https://res.cloudinary.com/s3kbkz8l/image/upload/v1787238243/rjnoouap1mokc1komvby.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Two different treatments, because the copy has two different shapes.
          Contrast was measured against the real composited pixels at both
          widths, not estimated — the first attempt at a single shared gradient
          passed on desktop and failed badly on mobile.

          Mobile: the copy runs to ~94% of the viewport, so there is no clear
          column to shape around and a bottom-weighted scrim is what keeps it
          readable. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,10,9,0.88)_0%,rgba(12,10,9,0.74)_55%,rgba(12,10,9,0.45)_100%)] md:hidden" />
      {/* Desktop: the copy is bounded to a left column, so the scrim can stay
          strong across exactly that column and then release. The right-hand
          side of the room stays a photograph rather than sitting under a flat
          overlay. Explicit stops because Tailwind's default via-50% put the
          falloff in the middle of the headline, and the plateau is held to 58%
          because that is where the copy column actually ends — measured, not
          guessed. Straddling the falloff instead cost ~5 points of contrast. */}
      <div className="absolute inset-0 hidden md:block md:bg-[linear-gradient(to_right,rgba(12,10,9,0.86)_0%,rgba(12,10,9,0.78)_58%,rgba(12,10,9,0.30)_74%,rgba(12,10,9,0)_90%)]" />
      <div className="absolute inset-0 hidden md:block md:bg-gradient-to-t md:from-stone-950/45 md:via-transparent md:to-stone-950/25" />
    </div>
  );
}

// Real A/B experiment (variant assigned by middleware.ts, read here
// server-side) rather than a fake framework — variant B tests alternate
// CTA wording, both leading to the same real destination.
const CTA_LABELS = { A: "Explore Our Programs", B: "Discover Our Programs" } as const;

export async function Hero() {
  const cookieStore = await cookies();
  const variant = cookieStore.get("ab-hero-cta")?.value === "B" ? "B" : "A";

  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-6 py-20 md:py-32">
        <div className="flex max-w-2xl flex-col gap-6">
          <h1 className="font-display text-4xl font-medium tracking-tight text-white md:text-6xl">
            Empowering Muslim Women in Business and Career.
          </h1>
          <p className="text-lg leading-relaxed text-white/85">
            TCM Foundation equips Muslim women with knowledge, opportunities, networks, and support to grow in their
            careers, businesses, leadership, and communities.
          </p>
          <div className="flex flex-wrap gap-4">
            <HeroCtaLink href="/programs" label={CTA_LABELS[variant]} variant={variant} buttonVariant="solid-inverse" />
            <Link href="/about" className={buttonStyles({ variant: "outline-inverse" })}>
              Learn About TCM
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
