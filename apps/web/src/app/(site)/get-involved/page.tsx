import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { getSiteSettings } from "@/lib/api/site-settings";
import { ExternalLink } from "@/components/ui/external-link";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Get Involved",
  description: "Donate, partner, volunteer, or explore careers with TCM Foundation.",
};

function ActionSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-stone-200 py-12 first:pt-0 last:border-b-0">
      <h2 className="font-display text-2xl font-medium text-stone-900 md:text-3xl">{title}</h2>
      <p className="mt-3 max-w-xl text-stone-600">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function GetInvolvedPage() {
  const settings = await getSiteSettings();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-brand-700">
          <Heart aria-hidden="true" className="size-5" />
          <p className="text-xs font-medium uppercase tracking-wide">Get Involved</p>
        </div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
          Be Part of the Change
        </h1>
      </div>

      <ActionSection
        id="donate"
        title="Donate"
        description="Your support helps TCM Foundation equip Muslim women with the knowledge, opportunities, and networks to thrive."
      >
        {settings.donateUrl ? (
          <ExternalLink href={settings.donateUrl} showIcon={false} className={buttonStyles({ variant: "primary" })}>
            Donate Now
          </ExternalLink>
        ) : (
          <span className="rounded-sm border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-400">
            Coming Soon
          </span>
        )}
      </ActionSection>

      <ActionSection
        id="partner"
        title="Partner With Us"
        description="Organizations and businesses can partner with TCM Foundation to expand our reach and impact."
      >
        <Link href="/contact" className={buttonStyles({ variant: "secondary" })}>
          Contact Us
        </Link>
      </ActionSection>

      <ActionSection
        id="volunteer"
        title="Volunteer"
        description="Share your time and skills to support TCM Foundation's programs and community."
      >
        <Link href="/contact" className={buttonStyles({ variant: "secondary" })}>
          Contact Us
        </Link>
      </ActionSection>

      <ActionSection id="careers" title="Careers" description="Explore career opportunities with TCM Foundation.">
        <Link href="/resources/opportunities?type=CAREER" className={buttonStyles({ variant: "secondary" })}>
          View Career Opportunities
        </Link>
      </ActionSection>
    </main>
  );
}
