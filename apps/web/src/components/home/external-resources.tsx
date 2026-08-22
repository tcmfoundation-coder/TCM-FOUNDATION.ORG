import { GraduationCap, PlayCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/api/site-settings";
import { ExternalLink } from "../ui/external-link";
import { buttonStyles } from "../ui/button";

// Learning Hub and TCM TV are both real, client-approved external
// destinations (see SiteSettings.learningHubUrl / tcmTvUrl) — paired into
// one section rather than two near-identical full-width bands. Either card
// shows "Coming Soon" if its URL hasn't been set yet, same honesty rule as
// the rest of the homepage: never invent a destination.
export async function ExternalResources() {
  const settings = await getSiteSettings();

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col items-start gap-5 rounded-sm border border-stone-200 p-8">
          <GraduationCap aria-hidden="true" className="size-8 text-brand-700" />
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-medium text-stone-900">Learn. Grow. Advance.</h2>
            <p className="text-stone-600">
              The TCM Learning Hub provides structured learning and professional development opportunities for
              Muslim women building careers, businesses, and leadership skills.
            </p>
          </div>
          {settings.learningHubUrl ? (
            <ExternalLink
              href={settings.learningHubUrl}
              showIcon={false}
              className={buttonStyles({ variant: "primary" })}
            >
              Visit Learning Hub
            </ExternalLink>
          ) : (
            <span className="rounded-sm border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-500">
              Coming Soon
            </span>
          )}
        </div>

        <div className="flex flex-col items-start gap-5 rounded-sm border border-stone-200 p-8">
          <PlayCircle aria-hidden="true" className="size-8 text-brand-700" />
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-medium text-stone-900">Watch TCM TV</h2>
            <p className="text-stone-600">
              Video stories, program highlights, and conversations from TCM Foundation — watch on our YouTube
              channel.
            </p>
          </div>
          {settings.tcmTvUrl ? (
            <ExternalLink href={settings.tcmTvUrl} showIcon={false} className={buttonStyles({ variant: "primary" })}>
              Watch on TCM TV
            </ExternalLink>
          ) : (
            <span className="rounded-sm border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-500">
              Coming Soon
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
