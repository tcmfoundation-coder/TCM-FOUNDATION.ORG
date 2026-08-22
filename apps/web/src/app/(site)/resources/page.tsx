import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Download, GraduationCap, Newspaper, Sparkles } from "lucide-react";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Resources",
  description:
    "TCM Foundation's Knowledge & Insights hub — Blog, Spotlights, Articles, Downloadable Materials, and the Opportunities Desk.",
  path: "/resources",
});

const SECTIONS = [
  { href: "/resources/blog", icon: Newspaper, title: "Blog", description: "Regular updates, thought pieces, tutorials, and reviews." },
  { href: "/resources/spotlights", icon: Sparkles, title: "Spotlights", description: "Features on inspiring Muslim women breaking barriers." },
  { href: "/resources/articles", icon: BookOpen, title: "Articles", description: "Expert-written content on business, career, and faith-centered growth." },
  { href: "/resources/downloads", icon: Download, title: "Downloadable Materials", description: "Budget templates, CV templates, tax calculators, and more." },
  { href: "/resources/opportunities", icon: GraduationCap, title: "Opportunities Desk", description: "Curated grants, scholarships, fellowships, and competitions." },
];

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="mb-12 flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Knowledge &amp; Insights</p>
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">Resources</h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex flex-col gap-3 border border-stone-200 p-6 transition-colors hover:border-brand-300"
          >
            <section.icon aria-hidden="true" className="size-6 text-brand-700" />
            <h2 className="font-display text-lg font-medium text-stone-900">{section.title}</h2>
            <p className="text-sm text-stone-600">{section.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
