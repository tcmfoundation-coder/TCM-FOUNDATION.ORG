import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { listSupportServices } from "@/lib/api/support";
import { SupportLabForm } from "@/components/content/support-lab-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "TCM Support Lab",
  description: "Book a session for business consulting, career support, and guidance from TCM Foundation.",
  path: "/support-lab",
});

export default async function SupportLabPage() {
  const services = await listSupportServices();
  const activeServices = services.filter((service) => service.isActive);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Contact & Support", href: "/contact" }, { label: "TCM Support Lab" }]} />
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">TCM Support Lab</p>
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
          Book a Session
        </h1>
        <p className="text-stone-600">
          Request business consulting, career support, or guidance from the TCM Foundation team.
        </p>
      </div>

      <div className="mt-10">
        {activeServices.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="Support Lab sessions coming soon"
            description="We're not accepting bookings for a specific service yet — check back soon."
          />
        ) : (
          <SupportLabForm services={activeServices} />
        )}
      </div>
    </main>
  );
}
