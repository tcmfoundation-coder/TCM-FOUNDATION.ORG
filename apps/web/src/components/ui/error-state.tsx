"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "./button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "We couldn't load this right now.",
  description = "Please try again in a moment.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-sm border border-error/30 bg-error/5 px-6 py-16 text-center"
    >
      <AlertCircle aria-hidden="true" className="size-8 text-error" />
      <p className="font-medium text-stone-800">{title}</p>
      <p className="max-w-sm text-sm text-stone-600">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
