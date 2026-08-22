"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { TurnstileWidget } from "../ui/turnstile-widget";
import { submitSupportRequest, type SupportService } from "@/lib/api/support";
import { trackEvent } from "@/lib/analytics";

// Blueprint workflow (Support Lab section): "Submit -> Confirmation ->
// Relevant Resource Page". SupportService has no field linking it to a
// specific resource, so routing to a *specific* relevant resource per
// service would mean inventing that mapping — instead this redirects to
// the general Resources hub, which the requirement's "where possible"
// wording allows. Auto-redirects after a few seconds so the confirmation
// is still readable, with a manual link for anyone who doesn't want to wait.
const RESOURCES_REDIRECT_DELAY_MS = 4_000;

const schema = z.object({
  serviceId: z.string().min(1, "Please select a service"),
  requesterName: z.string().min(1, "Full name is required"),
  requesterEmail: z.string().min(1, "Email address is required").email("Enter a valid email address"),
  requesterPhone: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

type FormValues = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "server-error";

export function SupportLabForm({ services }: { services: SupportService[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { serviceId: services[0]?.id ?? "" },
  });

  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => router.push("/resources"), RESOURCES_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, router]);

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    try {
      await submitSupportRequest({
        ...values,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      trackEvent("support_request_submitted", { serviceId: values.serviceId });
      setStatus("success");
      reset();
    } catch {
      setStatus("server-error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">
          Thank you — your request has been received. TCM Foundation will reach out to schedule your session.
        </Alert>
        <Link href="/resources" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
          Continue to Resources <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
      {status === "server-error" && (
        <Alert variant="error">We couldn&apos;t send your request right now. Please try again.</Alert>
      )}

      <Select label="Service" error={errors.serviceId?.message} {...register("serviceId")}>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </Select>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full Name" error={errors.requesterName?.message} {...register("requesterName")} />
        <Input label="Email Address" type="email" error={errors.requesterEmail?.message} {...register("requesterEmail")} />
      </div>
      <Input label="Phone Number (optional)" type="tel" {...register("requesterPhone")} />
      <Textarea
        label="Message"
        error={errors.message?.message}
        hint="Tell us what you'd like help with"
        {...register("message")}
      />

      <TurnstileWidget onToken={setTurnstileToken} />

      <Button type="submit" disabled={status === "loading"} className="w-fit">
        {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Request Support
      </Button>
    </form>
  );
}
