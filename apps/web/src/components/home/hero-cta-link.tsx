"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { buttonStyles } from "../ui/button";

export function HeroCtaLink({ href, label, variant }: { href: string; label: string; variant: "A" | "B" }) {
  return (
    <Link
      href={href}
      className={buttonStyles({ variant: "primary" })}
      onClick={() => trackEvent("ab_test_cta_click", { test: "hero_cta", variant })}
    >
      {label}
    </Link>
  );
}
