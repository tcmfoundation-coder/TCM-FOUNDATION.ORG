import Link from "next/link";
import { Layers } from "lucide-react";
import { listPrograms } from "@/lib/api/programs";
import { ProgramCard } from "../content/program-card";
import { EmptyState } from "../ui/empty-state";
import { buttonStyles } from "../ui/button";

export async function ProgramsPreview() {
  const response = await listPrograms({ take: 3 });
  const programs = Array.isArray(response) ? response : response?.items || [];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="mb-10 flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">How We Create Impact</p>
        <h2 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">Our Programs</h2>
      </div>

      {programs.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Programs will appear here once published"
          description="TCM Foundation's flagship programs are being added to the site."
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
          <div className="mt-10">
            <Link href="/programs" className={buttonStyles({ variant: "secondary" })}>
              View All Programs
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
