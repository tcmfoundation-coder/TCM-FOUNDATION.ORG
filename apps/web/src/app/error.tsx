"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log for operational visibility without exposing internals to the user
    // (never render error.message/stack — plan's Security Rules).
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-error">Error</p>
      <h1 className="font-display text-3xl font-medium text-stone-900">Something went wrong on our side.</h1>
      <p className="text-stone-600">We&apos;re sorry for the inconvenience. Please try again.</p>
      <Button variant="primary" onClick={reset}>
        Try Again
      </Button>
    </main>
  );
}
