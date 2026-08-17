import { Breadcrumbs } from "../ui/breadcrumbs";

interface ResourceDetailProps {
  breadcrumbLabel: string;
  breadcrumbHref: string;
  title: string;
  subtitle?: string | null;
  date?: string | null;
  body: string;
}

// Shared shape for Blog/Article/Spotlight detail pages — identical layout,
// so one component rather than three near-duplicates.
export function ResourceDetail({ breadcrumbLabel, breadcrumbHref, title, subtitle, date, body }: ResourceDetailProps) {
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: breadcrumbLabel, href: breadcrumbHref }, { label: title }]} />

      <div className="mt-6 flex flex-col gap-2">
        {date && (
          <time dateTime={date} className="text-sm text-stone-500">
            {new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </time>
        )}
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">{title}</h1>
        {subtitle && <p className="text-lg text-stone-600">{subtitle}</p>}
      </div>

      <div className="mt-8 flex flex-col gap-4 text-stone-700">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </main>
  );
}
