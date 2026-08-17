import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { listPrograms } from "@/lib/api/programs";
import { ProgramCard } from "@/components/content/program-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Programs",
  description: "TCM Foundation's flagship impact programs.",
};

export default async function ProgramsPage() {
  const programs = await listPrograms();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="mb-12 flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">How We Create Impact</p>
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
          Our Programs
        </h1>
      </div>

      {programs.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Programs will appear here once published"
          description="TCM Foundation's flagship programs are being added to the site."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      )}
    </main>
  );
}
