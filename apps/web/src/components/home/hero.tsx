import Link from "next/link";
import { cookies } from "next/headers";
import { buttonStyles } from "../ui/button";
import { HeroCtaLink } from "./hero-cta-link";

// Real hero photography ("confident, successful Muslim women in professional
// environments," per the design brief) hasn't been supplied yet, and the
// brief explicitly forbids stock-photo-looking substitutes. Rather than an
// apologetic gray box, the visual side is a tasteful geometric composition
// in the brand purple scale — an eight-pointed star (rub el hizb) motif,
// the kind of subtle Arabic-inspired accent the client's brief permits
// ("only as accents, not the main theme") — swapped for real photography
// once TCM supplies it.
function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 md:aspect-square"
    >
      <svg className="absolute inset-0 size-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-star" width="72" height="72" patternUnits="userSpaceOnUse">
            <g stroke="white" strokeWidth="1" fill="none">
              <rect x="16" y="16" width="40" height="40" transform="rotate(0 36 36)" />
              <rect x="16" y="16" width="40" height="40" transform="rotate(45 36 36)" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-star)" />
      </svg>
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
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:gap-16 md:py-24">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-6xl">
          Empowering Muslim Women to Lead, Grow &amp; Thrive.
        </h1>
        <p className="text-lg leading-relaxed text-stone-600">
          TCM Foundation equips Muslim women with knowledge, opportunities, networks, and support to grow in their
          careers, businesses, leadership, and communities.
        </p>
        <div className="flex flex-wrap gap-4">
          <HeroCtaLink href="/programs" label={CTA_LABELS[variant]} variant={variant} />
          <Link href="/about" className={buttonStyles({ variant: "secondary" })}>
            Learn About TCM
          </Link>
        </div>
      </div>
      <HeroVisual />
    </section>
  );
}
