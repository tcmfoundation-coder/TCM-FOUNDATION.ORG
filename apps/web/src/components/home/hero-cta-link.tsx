"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { buttonStyles, type ButtonVariant } from "../ui/button";

export function HeroCtaLink({
  href,
  label,
  variant,
  buttonVariant = "primary",
}: {
  href: string;
  label: string;
  variant: "A" | "B";
  buttonVariant?: ButtonVariant;
}) {
  return (
    <Link
      href={href}
      className={buttonStyles({ variant: buttonVariant })}
      onClick={() => trackEvent("ab_test_cta_click", { test: "hero_cta", variant })}
    >
      {label}
    </Link>
  );
}
