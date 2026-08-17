type PlaceholderPageProps = {
  title: string;
  description: string;
  phase: string;
};

// Routing skeleton for Phase 1. Real content/data wiring lands in the
// phase noted below — this is an honest placeholder, not a finished page,
// per the "no fake functionality" rule in the engineering instruction.
export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center gap-4 px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-stone-500">{phase}</p>
      <h1 className="text-3xl font-semibold text-stone-900">{title}</h1>
      <p className="text-stone-600">{description}</p>
    </main>
  );
}
