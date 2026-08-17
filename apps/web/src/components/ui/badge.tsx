import type { ReactNode } from "react";

// Use only for information that's actually meaningful (a status, a
// category) — never decorative labels like "NEW" or "FEATURED".
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" }) {
  const classes =
    tone === "brand"
      ? "bg-brand-50 text-brand-700 border-brand-200"
      : "bg-stone-100 text-stone-700 border-stone-200";
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${classes}`}>
      {children}
    </span>
  );
}
