import type { ReactNode } from "react";

// Draft legal content still contains bracketed placeholders (e.g. official
// address, jurisdiction) pending confirmation from TCM. Highlighted rather
// than silently rendered as plain text so an editor can spot what's left to
// fill in before these pages are treated as final.
export function Placeholder({ children }: { children: ReactNode }) {
  return <span className="rounded-sm bg-amber-50 px-1 py-0.5 text-amber-800">{children}</span>;
}

export function LegalPage({
  eyebrow,
  title,
  lastUpdated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{eyebrow}</p>
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">{title}</h1>
        <p className="text-sm text-stone-500">Last updated: {lastUpdated}</p>
      </div>

      {intro && <div className="mt-6 flex flex-col gap-4 leading-relaxed text-stone-700">{intro}</div>}

      <div className="mt-10 flex flex-col divide-y divide-stone-200">{children}</div>
    </main>
  );
}

export function LegalSection({ number, heading, children }: { number: string; heading: string; children: ReactNode }) {
  return (
    <section className="py-8 first:pt-0">
      <h2 className="font-display text-xl font-medium text-stone-900">
        {number} {heading}
      </h2>
      <div className="mt-3 flex flex-col gap-3 leading-relaxed text-stone-700">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pl-5 text-stone-700 [list-style-type:disc]">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
