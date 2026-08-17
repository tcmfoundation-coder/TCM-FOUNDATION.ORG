"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// Built on the native <dialog> element rather than hand-rolled ARIA — it
// gives correct focus containment, Escape-to-close, and a ::backdrop for
// free in every modern browser.
export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="modal-title"
      className="w-full max-w-md rounded-md border border-stone-200 p-0 shadow-xl backdrop:bg-stone-900/50"
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <h2 id="modal-title" className="font-display text-lg font-medium">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-sm p-1 text-stone-500 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
