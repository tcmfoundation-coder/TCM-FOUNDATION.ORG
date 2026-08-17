import { Handshake } from "lucide-react";
import { listPartners } from "@/lib/api/partners";
import { PartnerLogo } from "../content/partner-logo";
import { EmptyState } from "../ui/empty-state";

export async function Partners() {
  const partners = await listPartners();

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <h2 className="mb-10 text-center font-display text-2xl font-medium text-stone-900 md:text-3xl">
        Partners &amp; Supporters
      </h2>

      {partners.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Partners will appear here once confirmed"
          description="TCM Foundation's partner and supporter logos will be published as they're approved."
        />
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6">
          {partners.map((partner) => (
            <PartnerLogo key={partner.id} partner={partner} />
          ))}
        </div>
      )}
    </section>
  );
}
