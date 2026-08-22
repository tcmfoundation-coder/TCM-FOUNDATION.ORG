"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  title: string;
  /** Optional metadata — every field is rendered only when present. */
  category?: string;
  date?: string;
  description?: string;
}

/**
 * Featured-plus-peek editorial carousel.
 *
 * One dominant image sits alongside a receding stack of upcoming ones, so it
 * reads as scrollable without needing dots or instructions. The caption lives
 * below the imagery rather than on top of it: these are photographs, and
 * covering faces with a gradient to make room for text costs more than it
 * gains.
 *
 * The featured card is always leftmost and the queue only ever extends to the
 * right — nothing accumulates behind it — and the sequence loops, so the
 * arrows never dead-end. That is achieved by giving each card a CSS `order`
 * derived from its distance ahead of the active one, rather than reordering
 * the DOM: React then leaves the nodes alone and the width transition carries
 * the motion, instead of nodes being torn down and rebuilt mid-animation.
 *
 * The far end of the queue is clipped by the container rather than scrolled,
 * which is what produces the slivers running off the right edge. Touch swipe
 * is handled explicitly since there is no native scrolling to inherit it from.
 * The global prefers-reduced-motion rule in globals.css neutralises the
 * transition for anyone who asks for that.
 */

/**
 * Card width by distance from the featured item. Each upcoming card is about
 * half the previous one, which is what produces the receding "there is more
 * this way" stack instead of a row of equal thumbnails. Cards already scrolled
 * past stay narrow — they are behind the viewport edge anyway.
 */
function widthClass(position: number): string {
  if (position === 0) return "w-[84%] sm:w-[74%] lg:w-[70%]";
  if (position === 1) return "w-[24%] sm:w-[17%] lg:w-[15%]";
  if (position === 2) return "w-[13%] sm:w-[9%] lg:w-[8%]";
  if (position === 3) return "w-[7%] sm:w-[5%] lg:w-[4%]";
  return "w-[4%] sm:w-[3%] lg:w-[2.5%]";
}

export function EditorialGallery({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const touchStartX = useRef<number | null>(null);

  const count = items.length;

  // Wraps in both directions, so the arrows never dead-end.
  const goTo = useCallback(
    (index: number) => setActive(((index % count) + count) % count),
    [count],
  );

  function handleTrackKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(active + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(active - 1);
    }
  }

  if (count === 0) return null;

  const featured = items[active];

  return (
    // Negative margins let the gallery breathe wider than the surrounding
    // prose column, which is what gives it the reference's presence. Capped
    // and only applied where there is room, so it can never overflow the page.
    <div className="flex flex-col lg:-mx-12 xl:-mx-28">
      {/* Controls sit above the imagery, right-aligned with the section
          heading, so they never cover a photograph. */}
      {count > 1 && (
        <div className="mb-4 flex items-center justify-end gap-2">
          <ArrowButton direction="previous" onClick={() => goTo(active - 1)} />
          <ArrowButton direction="next" onClick={() => goTo(active + 1)} />
        </div>
      )}

      <ul
        ref={trackRef}
        // Clipped, not scrolled: the queue runs off the right edge as slivers
        // and the page never gains a sideways scrollbar.
        className="flex touch-pan-y gap-2 overflow-hidden md:gap-3"
        onKeyDown={handleTrackKeyDown}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          const end = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (start == null || end == null) return;
          const delta = end - start;
          // Generous threshold so a vertical scroll isn't read as a swipe.
          if (Math.abs(delta) < 50) return;
          goTo(delta < 0 ? active + 1 : active - 1);
        }}
        // A scrollable region needs to be reachable and labelled for anyone
        // not using a pointer.
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Programme and event photographs"
      >
        {items.map((item, index) => {
          // Distance *ahead* of the featured card, wrapping — so the queue only
          // ever runs rightwards and never accumulates on the left.
          const position = (index - active + count) % count;
          const isActive = position === 0;
          return (
            <li
              key={item.id}
              style={{ order: position }}
              className={`shrink-0 transition-[width] duration-500 ease-out ${widthClass(position)}`}
            >
              <button
                type="button"
                onClick={() => (isActive ? setLightboxIndex(index) : goTo(index))}
                onFocus={() => goTo(index)}
                aria-label={
                  isActive
                    ? `Open image ${index + 1} of ${count} full screen: ${item.alt}`
                    : `Show image ${index + 1} of ${count}: ${item.alt}`
                }
                className="group relative block h-60 w-full overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:h-80 lg:h-[27rem]"
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  // The featured card is the largest thing on screen; the
                  // receding ones are a small fraction of the width.
                  sizes={isActive ? "(min-width: 1024px) 70vw, 84vw" : "(min-width: 1024px) 15vw, 24vw"}
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  className="object-cover"
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Caption for the featured item, below the imagery. Keyed on the active
          index so assistive tech announces the change when you navigate. */}
      <div
        key={featured.id}
        className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        aria-live="polite"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          {(featured.category || featured.date) && (
            <p className="truncate text-xs font-medium uppercase tracking-wide text-brand-700">
              {[featured.category, featured.date].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="max-w-2xl text-base leading-relaxed text-stone-900">
            <span className="font-medium">{featured.title}</span>
            {featured.description && (
              <span className="text-stone-600"> {featured.description}</span>
            )}
          </p>
        </div>

        <p className="shrink-0 text-sm tabular-nums text-stone-500 sm:pt-1">
          {active + 1} / {count}
        </p>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => {
            const closingAt = lightboxIndex;
            setLightboxIndex(null);
            goTo(closingAt);
          }}
        />
      )}
    </div>
  );
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${direction === "previous" ? "Previous" : "Next"} image`}
      className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

/**
 * Full-screen viewer. Built on <dialog> for the same reasons ui/modal.tsx is:
 * focus containment, Escape-to-close and a ::backdrop without hand-rolled
 * ARIA.
 */
function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: GalleryItem[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const item = items[index];
  const count = items.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= count) return;
      onIndexChange(next);
    },
    [count, onIndexChange],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, index]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        // Clicking the backdrop — the dialog element itself — closes.
        if (event.target === dialogRef.current) onClose();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start == null || end == null) return;
        const delta = end - start;
        // Generous threshold so a vertical scroll attempt isn't read as a swipe.
        if (Math.abs(delta) < 60) return;
        go(delta < 0 ? index + 1 : index - 1);
      }}
      aria-label={`Image ${index + 1} of ${count}: ${item.alt}`}
      className="h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-stone-950/92"
    >
      <div className="relative flex h-full w-full flex-col">
        <div className="flex items-center justify-between gap-4 p-4 text-white sm:p-6">
          <p className="text-sm tabular-nums text-white/80" aria-live="polite">
            {index + 1} / {count}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image viewer"
            className="flex size-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="relative flex-1">
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-4 sm:p-6">
          <LightboxArrow direction="previous" disabled={index === 0} onClick={() => go(index - 1)} />
          <div className="min-w-0 px-2 text-center">
            <p className="truncate font-display text-base font-medium text-white">{item.title}</p>
            {(item.category || item.date) && (
              <p className="truncate text-xs uppercase tracking-wide text-white/70">
                {[item.category, item.date].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <LightboxArrow
            direction="next"
            disabled={index === count - 1}
            onClick={() => go(index + 1)}
          />
        </div>
      </div>
    </dialog>
  );
}

function LightboxArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${direction === "previous" ? "Previous" : "Next"} image`}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
