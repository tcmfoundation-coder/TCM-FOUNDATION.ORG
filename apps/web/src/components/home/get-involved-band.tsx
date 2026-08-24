import Link from "next/link";
import { ArrowRight, Briefcase, HandHeart, Handshake, Users } from "lucide-react";
import { ArabicAccent } from "../content/arabic-accent";

// Only the actions in the approved V1 "Get Involved" scope (Donate,
// Partnerships, Volunteer, Careers) — no "Become a Member" or similar, which
// isn't part of the approved scope. Donate stays visually primary: it is the
// clearest single ask on a section that otherwise presents four options.
//
// The one-word verbs describe what each existing action already is. No blurb
// on Donate: describing how funds are used would be an organizational claim
// TCM has not supplied, so the card earns its primacy through size, contrast
// and position instead.
const PRIMARY_ACTION = {
  href: "/get-involved#donate",
  verb: "Give",
  label: "Donate",
  icon: HandHeart,
};

const SECONDARY_ACTIONS = [
  {
    href: "/get-involved#partner",
    verb: "Collaborate",
    label: "Partner With Us",
    icon: Handshake,
  },
  {
    href: "/get-involved#volunteer",
    verb: "Contribute",
    label: "Volunteer",
    icon: Users,
  },
  {
    href: "/get-involved#careers",
    verb: "Build",
    label: "Careers",
    icon: Briefcase,
  },
];

export function GetInvolvedBand() {
  return (
    <section className="relative overflow-hidden bg-brand-900 px-6 py-16 text-white md:py-24">
      {/* Retained rub el hizb motif — the existing subtle Arabic-inspired
          accent, unchanged. */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-10">
        <defs>
          <pattern id="cta-star" width="72" height="72" patternUnits="userSpaceOnUse">
            <g stroke="white" strokeWidth="1" fill="none">
              <rect x="16" y="16" width="40" height="40" />
              <rect x="16" y="16" width="40" height="40" transform="rotate(45 36 36)" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cta-star)" />
      </svg>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        {/* The pivot from "what TCM does" to "how you take part". The phrase is
            placed here because knowing one another is what this section asks
            for — not as ornament. */}
        <div className="flex flex-col items-center gap-6 text-center">
          <ArabicAccent tone="light" />
          <h2 className="max-w-2xl font-display text-3xl font-medium tracking-tight md:text-4xl">
            Be Part of the Change.
          </h2>
        </div>

        {/* Deliberately not four identical tiles: Donate is the primary ask and
            is sized to say so. */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            href={PRIMARY_ACTION.href}
            className="group flex flex-col justify-between gap-6 rounded-sm bg-white p-6 text-brand-950 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:row-span-3 lg:p-8"
          >
            <div className="flex flex-col gap-3">
              <PRIMARY_ACTION.icon aria-hidden="true" className="size-7 text-brand-700" />
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">
                {PRIMARY_ACTION.verb}
              </p>
              <p className="font-display text-2xl font-medium lg:text-3xl">{PRIMARY_ACTION.label}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
              {PRIMARY_ACTION.label}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              />
            </span>
          </Link>

          <div className="flex flex-col gap-4 lg:col-span-2">
            {SECONDARY_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 rounded-sm border border-white/20 bg-white/5 p-5 transition-colors duration-300 hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:p-6"
              >
                <action.icon aria-hidden="true" className="size-6 shrink-0 text-white/70" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">
                    {action.verb}
                  </span>
                  <span className="font-display text-lg font-medium">{action.label}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="ml-auto size-4 shrink-0 text-white/70 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
