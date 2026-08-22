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
        // Edge fade + a track holding two identical copies of the logo
        // list, animated via the `marquee` keyframes in globals.css.
        // Pausing on hover/focus lets a visitor stop the strip to read or
        // click a specific logo instead of chasing a moving target — the
        // second copy is aria-hidden + inert so keyboard/screen-reader
        // users only ever encounter each partner once.
        <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-[marquee_36s_linear_infinite] gap-12 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
            <div className="flex shrink-0 items-center gap-12">
              {partners.map((partner) => (
                <PartnerLogo key={partner.id} partner={partner} />
              ))}
            </div>
            <div aria-hidden="true" inert className="flex shrink-0 items-center gap-12">
              {partners.map((partner) => (
                <PartnerLogo key={`repeat-${partner.id}`} partner={partner} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
