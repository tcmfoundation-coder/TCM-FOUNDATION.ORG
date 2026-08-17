import type { Metadata } from "next";
import { Download as DownloadIcon } from "lucide-react";
import { getDownloadBySlug } from "@/lib/api/downloads";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export async function generateMetadata({ params }: PageProps<"/resources/downloads/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const download = await fetchOrNotFound(() => getDownloadBySlug(slug));
  return { title: download.title, description: download.description ?? undefined };
}

export default async function DownloadPage({ params }: PageProps<"/resources/downloads/[slug]">) {
  const { slug } = await params;
  const download = await fetchOrNotFound(() => getDownloadBySlug(slug));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Breadcrumbs
        items={[
          { label: "Resources", href: "/resources" },
          { label: "Downloadable Materials", href: "/resources/downloads" },
          { label: download.title },
        ]}
      />
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        {download.title}
      </h1>
      {download.description && <p className="mt-6 text-lg leading-relaxed text-stone-600">{download.description}</p>}

      {/* File delivery awaits Cloudinary configuration (plan Open Question #9)
          — an honest "pending" state, not a broken download link. */}
      <div className="mt-10 flex items-center gap-2 rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-500">
        <DownloadIcon aria-hidden="true" className="size-4" />
        File upload pending — this download will be available once media hosting is configured.
      </div>
    </main>
  );
}
