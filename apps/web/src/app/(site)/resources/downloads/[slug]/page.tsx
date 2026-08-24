import type { Metadata } from "next";
import { Download as DownloadIcon } from "lucide-react";
import { getDownloadBySlug } from "@/lib/api/downloads";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildMetadata } from "@/lib/seo";
import { buildCloudinaryAttachmentUrl, sanitizeDownloadFilename } from "@/lib/cloudinary-download";

export async function generateMetadata({ params }: PageProps<"/resources/downloads/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const download = await fetchOrNotFound(() => getDownloadBySlug(slug));
  return buildMetadata({
    title: download.title,
    description: download.description ?? `Download ${download.title} from TCM Foundation.`,
    path: `/resources/downloads/${slug}`,
  });
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

      {download.file ? (
        <a
          href={buildCloudinaryAttachmentUrl(download.file.secureUrl, download.title)}
          download={sanitizeDownloadFilename(download.title)}
          className="mt-10 inline-flex items-center gap-2 rounded-sm bg-brand-700 px-5 py-3 text-sm font-medium text-white hover:bg-brand-800"
        >
          <DownloadIcon aria-hidden="true" className="size-4" />
          Download File
        </a>
      ) : (
        // Honest "pending" state, not a broken download link — an admin has
        // created the resource but not yet attached a file to it.
        <div className="mt-10 flex items-center gap-2 rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-500">
          <DownloadIcon aria-hidden="true" className="size-4" />
          File upload pending — this download will be available once a file is attached.
        </div>
      )}
    </main>
  );
}
