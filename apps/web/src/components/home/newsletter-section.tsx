import { NewsletterForm } from "../content/newsletter-form";

export function NewsletterSection() {
  return (
    <section className="bg-brand-950 px-6 py-16 text-white md:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h2 className="font-display text-2xl font-medium md:text-3xl">Stay Connected</h2>
        <p className="max-w-md text-white/70">
          Get updates on TCM Foundation programs, resources, and opportunities.
        </p>
        <div className="mt-2 w-full max-w-md">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
