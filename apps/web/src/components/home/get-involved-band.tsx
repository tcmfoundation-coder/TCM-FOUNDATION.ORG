import Link from "next/link";
import { buttonStyles } from "../ui/button";

// Only the actions in the approved V1 "Get Involved" scope (Donate,
// Partnerships, Volunteer, Careers) — no "Become a Member" or similar,
// which isn't part of the approved scope.
const ACTIONS = [
  { href: "/get-involved#donate", label: "Donate" },
  { href: "/get-involved#partner", label: "Partner With Us" },
  { href: "/get-involved#volunteer", label: "Volunteer" },
  { href: "/get-involved#careers", label: "Careers" },
];

export function GetInvolvedBand() {
  return (
    <section className="relative overflow-hidden bg-brand-900 px-6 py-16 text-white md:py-24">
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

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">Be Part of the Change.</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className={buttonStyles({ variant: "outline-inverse" })}>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
