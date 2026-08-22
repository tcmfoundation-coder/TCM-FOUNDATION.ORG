"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { TurnstileWidget } from "../ui/turnstile-widget";
import { subscribeToNewsletter } from "@/lib/api/newsletter";
import { trackEvent } from "@/lib/analytics";

const schema = z.object({
  email: z.string().min(1, "Email address is required").email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "already-subscribed" | "server-error";

export function NewsletterForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    try {
      const result = await subscribeToNewsletter(values.email, turnstileToken);
      if (!result.alreadySubscribed) trackEvent("newsletter_subscribed");
      setStatus(result.alreadySubscribed ? "already-subscribed" : "success");
    } catch {
      setStatus("server-error");
    }
  }

  if (status === "success") {
    return <Alert variant="success">You&apos;re subscribed — thank you for staying connected with TCM Foundation.</Alert>;
  }

  if (status === "already-subscribed") {
    return <Alert variant="info">This email is already subscribed.</Alert>;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Enter your email address"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "newsletter-email-error" : undefined}
          // border-white/20 measured 1.86:1 against this section's background;
          // WCAG 1.4.11 wants >=3:1 for a control's boundary. /40 clears it
          // without turning the field into a hard-edged box.
          className="w-full rounded-sm border border-white/40 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
          {...register("email")}
        />
        {errors.email && (
          <p id="newsletter-email-error" className="mt-1.5 text-xs text-red-300">
            {errors.email.message}
          </p>
        )}
        {status === "server-error" && (
          <p role="alert" className="mt-1.5 text-xs text-red-300">
            We couldn&apos;t subscribe you right now. Please try again.
          </p>
        )}
        <TurnstileWidget onToken={setTurnstileToken} />
      </div>
      {/* solid-inverse, not the default primary: brand-600 on brand-950
          measured 2.67:1 surface contrast, under the 3:1 WCAG 1.4.11 floor for
          a UI component. This variant already exists for dark-background CTAs
          (see button.tsx) - no new styling introduced. */}
      <Button type="submit" variant="solid-inverse" disabled={status === "loading"} className="shrink-0">
        {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Subscribe
      </Button>
    </form>
  );
}
