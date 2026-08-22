import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/content/unsubscribe-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Unsubscribe",
    description: "Stop receiving email updates from TCM Foundation.",
    path: "/newsletter/unsubscribe",
  }),
  // Reached only from a link in an email and carries a one-time token in the
  // URL — there is nothing here for a search engine to index.
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: PageProps<"/newsletter/unsubscribe">) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16 md:py-24">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-700">
          Email preferences
        </span>
        <h1 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">
          Unsubscribe from updates
        </h1>
      </div>
      <UnsubscribeForm token={typeof token === "string" ? token : undefined} />
    </main>
  );
}
