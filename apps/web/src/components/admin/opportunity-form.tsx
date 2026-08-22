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
import { type Opportunity, type OpportunityType } from "@/lib/api/opportunities";
import { ApiError } from "@/lib/api-client";

const opportunitySchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["CAREER", "BUSINESS", "EDUCATION"]),
  deadline: z.string().optional(),
  externalApplyUrl: z.string().url("Invalid URL"),
});

type FormData = z.infer<typeof opportunitySchema>;

interface OpportunityFormProps {
  opportunity?: Opportunity;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function OpportunityForm({ opportunity, onSubmit, onCancel, submitLabel = "Create Opportunity" }: OpportunityFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: opportunity
      ? {
          slug: opportunity.slug,
          title: opportunity.title,
          description: opportunity.description,
          type: opportunity.type,
          deadline: opportunity.deadline || "",
          externalApplyUrl: opportunity.externalApplyUrl,
        }
      : {
          slug: "",
          title: "",
          description: "",
          type: "CAREER",
          deadline: "",
          externalApplyUrl: "",
        },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      // An untouched date input submits "", which @IsDateString() rejects
      // outright — only @IsOptional() skips undefined (same reason
      // program-form.tsx normalizes its optional fields this way).
      await onSubmit({ ...data, deadline: data.deadline || undefined });
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

      <Input label="Slug" error={errors.slug?.message} {...register("slug")} hint="URL-friendly identifier (e.g., grant-2024)" />
      <Input label="Title" error={errors.title?.message} {...register("title")} />
      <Textarea label="Description" error={errors.description?.message} {...register("description")} rows={4} hint="Brief description of the opportunity" />

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Type</label>
        <select
          {...register("type")}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="CAREER">Career</option>
          <option value="BUSINESS">Business</option>
          <option value="EDUCATION">Education</option>
        </select>
        {errors.type && <p className="mt-1 text-xs text-error">{errors.type.message}</p>}
      </div>

      <Input label="Deadline" error={errors.deadline?.message} {...register("deadline")} type="date" hint="Optional deadline date" />
      <Input label="External Apply URL" error={errors.externalApplyUrl?.message} {...register("externalApplyUrl")} hint="https://example.com/apply" />

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
