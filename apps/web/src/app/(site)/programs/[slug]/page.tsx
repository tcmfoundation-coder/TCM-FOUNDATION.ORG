import type { Metadata } from "next";
import Link from "next/link";
import { getProgramBySlug } from "@/lib/api/programs";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonStyles } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/programs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const program = await fetchOrNotFound(() => getProgramBySlug(slug));
  return buildMetadata({
    title: program.title,
    description: program.description,
    path: `/programs/${slug}`,
    image: program.heroImage ? { url: program.heroImage.secureUrl, alt: program.heroImage.altText } : undefined,
  });
}

export default async function ProgramDetailPage({ params }: PageProps<"/programs/[slug]">) {
  const { slug } = await params;
  const program = await fetchOrNotFound(() => getProgramBySlug(slug));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Programs", href: "/programs" }, { label: program.title }]} />

      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        {program.title}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-stone-600">{program.description}</p>

      {program.objectives && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-medium text-stone-900">Objectives</h2>
          <p className="mt-2 text-stone-600">{program.objectives}</p>
        </section>
      )}

      {program.audience && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-medium text-stone-900">Who It&apos;s For</h2>
          <p className="mt-2 text-stone-600">{program.audience}</p>
        </section>
      )}

      {program.impact && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-medium text-stone-900">Impact</h2>
          <p className="mt-2 text-stone-600">{program.impact}</p>
        </section>
      )}

      {program.ctaUrl && program.ctaLabel && (
        <div className="mt-10">
          <Link href={program.ctaUrl} className={buttonStyles({ variant: "primary" })}>
            {program.ctaLabel}
          </Link>
        </div>
      )}
    </main>
  );
}
