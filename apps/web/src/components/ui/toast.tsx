"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

// Module-level pub-sub queue rather than React context — showToast() needs
// to be callable from plain event handlers anywhere in the admin panel
// (list components, detail views) without every caller needing to be
// wrapped in a provider or pass a toast prop down.
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<(toasts: Toast[]) => void>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

const AUTO_DISMISS_MS = 5_000;

export function showToast(message: string, variant: ToastVariant = "info") {
  const id = nextId++;
  toasts = [...toasts, { id, message, variant }];
  emit();
  setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

const config: Record<ToastVariant, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: "border-success/30 bg-white text-success" },
  error: { icon: XCircle, classes: "border-error/30 bg-white text-error" },
  info: { icon: Info, classes: "border-brand-700/30 bg-white text-brand-700" },
};

// Mounted once in apps/web/src/app/admin/layout.tsx so any admin component
// can call showToast() without needing a provider wrapper.
export function Toaster() {
  const [items, setItems] = useState<Toast[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {items.map((toast) => {
        const { icon: Icon, classes } = config[toast.variant];
        return (
          <div
            key={toast.id}
            role={toast.variant === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-sm border px-4 py-3 text-sm shadow-lg ${classes}`}
          >
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1 text-stone-800">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
