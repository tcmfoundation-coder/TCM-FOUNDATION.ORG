import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { listSpotlights } from "@/lib/api/spotlights";
import { EmptyState } from "../ui/empty-state";

/**
 * The section was rendering a story about a named woman anonymously —
 * `subjectName` is a real public field on Spotlight and simply was not being
 * shown. Naming the subject is the whole point of a spotlight, and the value
 * is real CMS data rather than invented attribution.
 *
 * The name is an attribution under the title, NOT a caption on the photo.
 * Cover images are editor-chosen and are frequently group shots (the current
 * one is captioned "Four TCM Foundation community members"), so labelling the
 * image with a single name would assert something the data does not support —
 * the reader cannot tell which person it refers to.
 *
 * The photograph reacts to hover, so the whole block is the click target via
 * a stretched link rather than a second anchor around the image.
 *
 * Aspect ratio is deliberately unchanged: these are editor-uploaded photos and
 * re-cropping to a portrait frame would cut faces out of landscape shots.
 */
export async function FeaturedStory() {
  const response = await listSpotlights({ take: 1 });
  const items = Array.isArray(response) ? response : response?.items || [];
  const story = items[0];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      {!story ? (
        <EmptyState
          icon={Sparkles}
          title="Spotlight stories coming soon"
          description="Features on inspiring Muslim women will appear here once published."
        />
      ) : (
        <div className="group relative grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 to-brand-300 md:order-2">
            {story.coverImage && (
              <Image
                src={story.coverImage.secureUrl}
                alt={
                  story.coverImage.altText ||
                  `Photograph accompanying the spotlight on ${story.subjectName}`
                }
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            )}
          </div>

          <div className="flex flex-col gap-4 md:order-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-700">Spotlight</p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">
              {story.title}
            </h2>
            {story.subjectName && (
              <p className="-mt-1 text-sm font-medium text-stone-500">{story.subjectName}</p>
            )}
            <p className="line-clamp-4 leading-relaxed text-stone-600">{story.body}</p>
            <Link
              href={`/resources/spotlights/${story.slug}`}
              /* Stretched-link pattern: the pseudo-element makes the whole
                 block clickable while keeping exactly one link, so the photo's
                 hover response corresponds to something real without adding a
                 duplicate tab stop or a second announcement for screen
                 readers. */
              className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium text-brand-700 after:absolute after:inset-0 after:content-[''] hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              Read Story
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
