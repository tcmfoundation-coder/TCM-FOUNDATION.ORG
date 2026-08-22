"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { X } from "lucide-react";
import { ExternalLink } from "./ui/external-link";
import { buttonStyles } from "./ui/button";
import type { TcmHubPopupConfig } from "./tcm-hub-popup";

// Deliberately not on load. An interstitial that fires the moment a visitor
// arrives is both hostile and an SEO liability on mobile (Google's
// intrusive-interstitial guidance), and the brief asks for efficient SEO
// alongside the popup. Six seconds in, the visitor has started reading and
// the advert reads as an invitation rather than a toll gate.
const SHOW_DELAY_MS = 6000;

const DISMISS_KEY = "tcm-hub-popup-dismissed";

// localStorage can throw outright in private-browsing/blocked-storage modes,
// so every access is guarded — failing to read or write it only ever costs
// the visitor an extra showing, never an error.
function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(url: string): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, url);
  } catch {
    // Storage unavailable — the popup simply shows again next visit.
  }
}

// Built on native <dialog> for the same reason ui/modal.tsx is: correct
// focus containment, Escape-to-close, and a ::backdrop for free.
export function TcmHubPopupDialog({ title, body, ctaLabel, url }: TcmHubPopupConfig) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Dismissal is keyed to the campaign URL, not a bare boolean, so
    // retiring one campaign and publishing a different one still reaches
    // people who dismissed the previous one.
    if (readDismissed() === url) return;

    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function dismiss() {
    setOpen(false);
    writeDismissed(url);
  }

  // A click landing on the <dialog> itself rather than its content is a
  // backdrop click — the ::backdrop is part of the dialog's own box.
  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) dismiss();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={dismiss}
      onCancel={dismiss}
      onClick={handleDialogClick}
      aria-labelledby="tcm-hub-popup-title"
      // Tailwind's preflight resets `margin: 0` on every element, which
      // cancels the UA stylesheet's `margin: auto` centering for a modal
      // <dialog> — so centering is set explicitly here, same as ui/modal.tsx.
      className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md border border-stone-200 bg-white p-0 shadow-xl backdrop:bg-stone-950/60 motion-safe:animate-[popup-in_240ms_ease-out]"
    >
      <div className="relative flex flex-col gap-3 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-6 py-7 text-white">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-sm p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <h2 id="tcm-hub-popup-title" className="max-w-[85%] font-display text-xl font-medium text-white">
          {title}
        </h2>
        {body && <p className="text-sm leading-relaxed text-white/85">{body}</p>}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <ExternalLink
            href={url}
            onClick={dismiss}
            className={buttonStyles({ variant: "solid-inverse", size: "sm" })}
          >
            {ctaLabel}
          </ExternalLink>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-sm px-2 py-1 text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
          >
            Not now
          </button>
        </div>
      </div>
    </dialog>
  );
}
