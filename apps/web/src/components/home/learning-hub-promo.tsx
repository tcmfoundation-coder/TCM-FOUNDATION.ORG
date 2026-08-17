import { GraduationCap } from "lucide-react";
import { getSiteSettings } from "@/lib/api/site-settings";
import { ExternalLink } from "../ui/external-link";
import { buttonStyles } from "../ui/button";

export async function LearningHubPromo() {
  const settings = await getSiteSettings();

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="flex flex-col items-start gap-6 border border-stone-200 p-8 md:flex-row md:items-center md:justify-between md:p-12">
        <div className="flex items-start gap-4">
          <GraduationCap aria-hidden="true" className="mt-1 size-8 shrink-0 text-brand-700" />
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-medium text-stone-900 md:text-3xl">Learn. Grow. Advance.</h2>
            <p className="max-w-xl text-stone-600">
              The TCM Learning Hub provides structured learning and professional development opportunities for
              Muslim women building careers, businesses, and leadership skills.
            </p>
          </div>
        </div>

        {settings.learningHubUrl ? (
          <ExternalLink
            href={settings.learningHubUrl}
            showIcon={false}
            className={buttonStyles({ variant: "primary", className: "shrink-0" })}
          >
            Visit Learning Hub
          </ExternalLink>
        ) : (
          <span className="shrink-0 rounded-sm border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-400">
            Coming Soon
          </span>
        )}
      </div>
    </section>
  );
}
