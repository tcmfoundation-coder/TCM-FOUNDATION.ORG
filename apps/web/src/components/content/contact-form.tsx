"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { submitContactForm } from "@/lib/api/contact";
import { trackEvent } from "@/lib/analytics";

const schema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().min(1, "Email address is required").email("Enter a valid email address"),
  phone: z.string().optional(),
  organization: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type FormValues = z.infer<typeof schema>;
type Status = "idle" | "loading" | "success" | "server-error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    try {
      await submitContactForm(values);
      trackEvent("contact_form_submitted");
      setStatus("success");
      reset();
    } catch {
      setStatus("server-error");
    }
  }

  if (status === "success") {
    return (
      <Alert variant="success">
        Thank you — your message has been received. TCM Foundation will get back to you soon.
      </Alert>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
      {status === "server-error" && (
        <Alert variant="error">We couldn&apos;t send your message right now. Please try again.</Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full Name" error={errors.name?.message} {...register("name")} />
        <Input label="Email Address" type="email" error={errors.email?.message} {...register("email")} />
        <Input label="Phone Number (optional)" type="tel" {...register("phone")} />
        <Input label="Organization (optional)" {...register("organization")} />
      </div>

      <Input label="Subject" error={errors.subject?.message} {...register("subject")} />
      <Textarea label="Message" error={errors.message?.message} {...register("message")} />

      <Button type="submit" disabled={status === "loading"} className="w-fit">
        {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Send Message
      </Button>
    </form>
  );
}
