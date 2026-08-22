import type { Metadata } from "next";
import { ContactForm } from "@/components/content/contact-form";
import { FaqExplorer } from "@/components/content/faq-explorer";
import { listFaq } from "@/lib/api/faq";
import { getSiteSettings } from "@/lib/api/site-settings";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact & Support",
  description: "Get in touch with TCM Foundation for general inquiries, or browse frequently asked questions.",
  path: "/contact",
});

export default async function ContactPage() {
  const [faq, settings] = await Promise.all([listFaq(), getSiteSettings()]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid gap-16 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Contact</p>
            <h1 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">
              Get in Touch
            </h1>
            <p className="text-stone-600">
              Have a general question for TCM Foundation? Send us a message below. Looking to book a consultation
              or request support instead? Visit{" "}
              <a href="/support-lab" className="text-brand-700 hover:text-brand-800">
                TCM Support Lab
              </a>{" "}
              — a separate workflow from general inquiries.
            </p>
            {(settings.contactEmail || settings.contactPhone) && (
              <dl className="flex flex-col gap-1 text-sm text-stone-600">
                {settings.contactEmail && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-stone-800">Email:</dt>
                    <dd>
                      <a href={`mailto:${settings.contactEmail}`} className="text-brand-700 hover:text-brand-800">
                        {settings.contactEmail}
                      </a>
                    </dd>
                  </div>
                )}
                {settings.contactPhone && (
                  <div className="flex gap-2">
                    <dt className="font-medium text-stone-800">Phone:</dt>
                    <dd>
                      <a href={`tel:${settings.contactPhone}`} className="text-brand-700 hover:text-brand-800">
                        {settings.contactPhone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <ContactForm />
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="font-display text-2xl font-medium text-stone-900">Frequently Asked Questions</h2>
          <FaqExplorer initialItems={faq} />
        </div>
      </div>
    </main>
  );
}
