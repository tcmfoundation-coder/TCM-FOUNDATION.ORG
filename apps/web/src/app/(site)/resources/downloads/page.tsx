import type { Metadata } from "next";
import Link from "next/link";
import { Download as DownloadIcon } from "lucide-react";
import { listDownloads } from "@/lib/api/downloads";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Downloadable Materials",
  description: "Budget templates, CV templates, tax calculators, and other resources from TCM Foundation.",
  path: "/resources/downloads",
});

export default async function DownloadsIndexPage() {
  const downloads = await listDownloads();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Downloadable Materials" }]} />
      <h1 className="mt-6 mb-12 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        Downloadable Materials
      </h1>

      {downloads.length === 0 ? (
        <EmptyState icon={DownloadIcon} title="Downloadable materials coming soon" />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {downloads.map((download) => (
            <Link
              key={download.id}
              href={`/resources/downloads/${download.slug}`}
              className="flex flex-col gap-3 border border-stone-200 p-6 transition-colors hover:border-brand-300"
            >
              <DownloadIcon aria-hidden="true" className="size-5 text-brand-700" />
              <h2 className="font-display text-lg font-medium text-stone-900">{download.title}</h2>
              {download.description && <p className="text-sm text-stone-600">{download.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
