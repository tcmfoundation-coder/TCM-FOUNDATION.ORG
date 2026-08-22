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
import { type TestimonialAdmin } from "@/lib/api/testimonials";
import { ApiError } from "@/lib/api-client";

const testimonialSchema = z.object({
  authorName: z.string().min(1, "Author name is required"),
  authorRole: z.string().optional(),
  quote: z.string().min(1, "Quote is required"),
});

type FormData = z.infer<typeof testimonialSchema>;

interface TestimonialFormProps {
  testimonial?: TestimonialAdmin;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function TestimonialForm({ testimonial, onSubmit, onCancel, submitLabel = "Create Testimonial" }: TestimonialFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: testimonial
      ? {
          authorName: testimonial.authorName,
          authorRole: testimonial.authorRole || "",
          quote: testimonial.quote,
        }
      : {
          authorName: "",
          authorRole: "",
          quote: "",
        },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await onSubmit(data);
    } catch (error) {
      setStatus("error");
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unexpected error occurred");
      }
    } finally {
      if (status !== "error") {
        setStatus("idle");
      }
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)} className="flex flex-col gap-5">
      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

      <Input label="Author Name" error={errors.authorName?.message} {...register("authorName")} />
      <Input label="Author Role" error={errors.authorRole?.message} {...register("authorRole")} hint="e.g., CEO, Founder, etc." />
      <Textarea label="Quote" error={errors.quote?.message} {...register("quote")} rows={4} hint="The testimonial quote" />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={status === "loading"}>
          Cancel
        </Button>
        <Button type="submit" disabled={status === "loading"} className="justify-center">
          {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
