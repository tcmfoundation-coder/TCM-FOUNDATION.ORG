import type { Metadata } from "next";
import { Images, Users } from "lucide-react";
import { listTeam } from "@/lib/api/team";
import { listPrograms } from "@/lib/api/programs";
import { EditorialGallery, type GalleryItem } from "@/components/content/editorial-gallery";
import { TeamMemberCard } from "@/components/content/team-member-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About Us",
  description: "Learn about TCM Foundation's vision, mission, history, team, and board.",
  path: "/about",
});

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-stone-200 py-12 first:pt-0 last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-medium text-stone-900 md:text-3xl">{title}</h2>
      <div className="mt-4 text-stone-600">{children}</div>
    </section>
  );
}

function PendingContent({ label }: { label: string }) {
  return (
    <p className="rounded-sm border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-500">
      TCM Foundation&apos;s {label} is being finalized and will appear here.
    </p>
  );
}

// Every published programme contributes its curated gallery photographs, and
// falls back to its hero image when no gallery has been assembled yet — so the
// section shows real programme photography rather than an empty state, and
// enriches automatically as galleries are filled in.
function toGalleryItems(programs: Awaited<ReturnType<typeof listPrograms>>["items"]): GalleryItem[] {
  return programs.flatMap((program) => {
    const images = program.galleryMedia.length > 0 ? program.galleryMedia : [program.heroImage];
    return images
      .filter((media): media is NonNullable<typeof media> => Boolean(media))
      .map((media) => ({
        id: `${program.id}-${media.id}`,
        src: media.secureUrl,
        // Falls back through the media's own alt text to the programme title,
        // so an image is never announced as unlabelled.
        alt: media.altText || program.title,
        title: program.title,
        category: "Programme",
        date: new Date(program.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        }),
        description: program.description,
      }));
  });
}

export default async function AboutPage() {
  const [team, board, advisory, programs] = await Promise.all([
    listTeam({ kind: "TEAM" }),
    listTeam({ kind: "BOARD" }),
    listTeam({ kind: "ADVISORY" }),
    listPrograms({ take: 100 }),
  ]);

  const galleryItems = toGalleryItems(programs.items);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <div className="mb-12 flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">About</p>
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
          About TCM Foundation
        </h1>
      </div>

      <Section eyebrow="Vision" title="Our Vision">
        <PendingContent label="vision statement" />
      </Section>

      <Section eyebrow="Mission" title="Our Mission">
        <PendingContent label="mission statement" />
      </Section>

      <Section eyebrow="History" title="Our Story">
        <PendingContent label="history" />
      </Section>

      <Section eyebrow="Gallery" title="Programmes &amp; Events">
        {galleryItems.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Programme photography coming soon"
            description="Photographs from TCM Foundation's programmes and events will appear here."
          />
        ) : (
          <EditorialGallery items={galleryItems} />
        )}
      </Section>

      <Section eyebrow="Team" title="Our Team">
        {team.length === 0 ? (
          <EmptyState icon={Users} title="Team profiles coming soon" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            {team.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </Section>

      <Section eyebrow="Board" title="Board & Advisory Members">
        {board.length === 0 && advisory.length === 0 ? (
          <EmptyState icon={Users} title="Board and advisory profiles coming soon" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-3">
            {[...board, ...advisory].map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}
