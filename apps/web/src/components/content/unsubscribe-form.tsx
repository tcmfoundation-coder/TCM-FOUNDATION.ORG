"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button, buttonStyles } from "../ui/button";
import { Alert } from "../ui/alert";
import { unsubscribeFromNewsletter } from "@/lib/api/newsletter";
import { ApiError } from "@/lib/api-client";

type Status = "idle" | "loading" | "done" | "invalid" | "error";

/**
 * Deliberately requires a click rather than unsubscribing on page load.
 * Mail scanners and link-preview bots fetch links in email, and doing the
 * work on load would let them opt people out who never touched the message.
 */
export function UnsubscribeForm({ token }: { token: string | undefined }) {
  const [status, setStatus] = useState<Status>(token ? "idle" : "invalid");
  const [email, setEmail] = useState<string | null>(null);

  async function handleUnsubscribe() {
    if (!token) return;
    setStatus("loading");
    try {
      const result = await unsubscribeFromNewsletter(token);
      setEmail(result.email);
      setStatus("done");
    } catch (error) {
      // A 400 or 404 both mean this link cannot be acted on — tell the person
      // that plainly instead of showing a generic failure they might retry.
      setStatus(
        error instanceof ApiError && (error.status === 404 || error.status === 400)
          ? "invalid"
          : "error",
      );
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col gap-5">
        <Alert variant="success">
          {email ? (
            <>
              <strong>{email}</strong> has been unsubscribed. You won&apos;t receive further
              updates from TCM Foundation.
            </>
          ) : (
            "You have been unsubscribed."
          )}
        </Alert>
        <p className="text-sm leading-relaxed text-stone-600">
          Changed your mind? You can subscribe again from the bottom of any page on our site.
        </p>
        <Link href="/" className={buttonStyles({ variant: "secondary", className: "w-fit" })}>
          Back to TCM Foundation
        </Link>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col gap-5">
        <Alert variant="warning">
          This unsubscribe link isn&apos;t valid. It may already have been used, or the address
          may have been removed already.
        </Alert>
        <p className="text-sm leading-relaxed text-stone-600">
          If you&apos;re still receiving emails you don&apos;t want, contact us and we&apos;ll
          remove you.
        </p>
        <Link href="/contact" className={buttonStyles({ variant: "secondary", className: "w-fit" })}>
          Contact us
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-base leading-relaxed text-stone-700">
        Confirm below and we&apos;ll stop sending you TCM Foundation updates. You can subscribe
        again at any time.
      </p>

      {status === "error" && (
        <Alert variant="error">
          We couldn&apos;t complete that just now. Please try again in a moment.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => void handleUnsubscribe()} disabled={status === "loading"}>
          {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Unsubscribe
        </Button>
        <Link href="/" className="text-sm text-stone-600 underline-offset-4 hover:underline">
          Keep receiving updates
        </Link>
      </div>
    </div>
  );
}
