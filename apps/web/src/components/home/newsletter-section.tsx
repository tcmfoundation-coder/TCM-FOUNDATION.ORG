import Image from "next/image";
import { NewsletterForm } from "../content/newsletter-form";

/**
 * The closing invitation. Padding was 80px top and bottom around ~165px of
 * content — half the section was empty space, which read as unfinished rather
 * than generous. Trimmed to 56/64px and the internal rhythm tightened, so the
 * whitespace now frames the invitation instead of swallowing it.
 *
 * The background is an abstract aurora (Unsplash, Klara Kulikova — free for
 * commercial use). It sits on top of the existing brand-950 fill rather than
 * replacing it, so the section keeps its brand ground if the image ever fails
 * to load. It was measured before use, not chosen by eye: the source is
 * near-black overall (mean rgb(27,0,31), darker than brand-950 itself) with the
 * magenta confined to a small sweep, so white text keeps its contrast.
 *
 * Copy, form, API call, validation, Turnstile and analytics are untouched.
 */
export function NewsletterSection() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-950 px-6 py-14 text-white md:py-16">
      <Image
        src="/brand/newsletter-aurora.jpg"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Pulls the image toward the brand plum and holds a contrast floor over
          the brightest part of the sweep. Deliberately light — the point is a
          sense of depth, not a scrim. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-950/55" />

      {/* max-w-xl rather than max-w-3xl: the form inside is 28rem, so the wider
          container left the heading floating in horizontal emptiness too. */}
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <h2 className="font-display text-2xl font-medium md:text-3xl">Stay Connected</h2>
        <p className="max-w-md text-balance text-white/70">
          Get updates on TCM Foundation programs, resources, and opportunities.
        </p>
        <div className="mt-3 w-full max-w-md">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
