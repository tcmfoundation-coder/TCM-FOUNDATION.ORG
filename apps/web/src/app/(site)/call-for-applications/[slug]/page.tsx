import type { Metadata } from "next";
import { AlertCircle, CalendarClock } from "lucide-react";
import { getCallForApplicationBySlug } from "@/lib/api/call-for-applications";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ApplicationForm } from "@/components/content/application-form";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/call-for-applications/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const call = await fetchOrNotFound(() => getCallForApplicationBySlug(slug));
  return buildMetadata({
    title: call.title,
    description: call.description,
    path: `/call-for-applications/${slug}`,
  });
}

export default async function CallForApplicationDetailPage({ params }: PageProps<"/call-for-applications/[slug]">) {
  const { slug } = await params;
  const call = await fetchOrNotFound(() => getCallForApplicationBySlug(slug));

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Call for Applications", href: "/call-for-applications" }, { label: call.title }]} />

      <div className="mt-6 flex flex-col gap-2">
        {call.programType && <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{call.programType}</p>}
        <h1 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">{call.title}</h1>
      </div>

      {call.description && <p className="mt-6 text-lg leading-relaxed text-stone-600">{call.description}</p>}

      {call.closeDate && (
        <p className="mt-4 flex items-center gap-2 text-sm text-stone-500">
          <CalendarClock aria-hidden="true" className="size-4" />
          Deadline: {new Date(call.closeDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </p>
      )}

      <div className="mt-10 border-t border-stone-200 pt-10">
        {call.status === "OPEN" ? (
          <ApplicationForm slug={call.slug} fields={call.fields} />
        ) : (
          <div className="flex items-start gap-3 rounded-sm border border-stone-200 bg-stone-50 p-4">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-stone-500" />
            <p className="text-sm text-stone-700">
              {call.status === "CLOSED"
                ? "This call for applications is now closed and no longer accepting submissions."
                : "This call for applications is not yet open for submissions."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
