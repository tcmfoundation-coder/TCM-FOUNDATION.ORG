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
import { MediaPicker } from "./media-picker";
import { type ProgramAdmin, type ProgramWriteInput } from "@/lib/api/programs";
import type { MediaRef } from "@/lib/api/media-ref";
import { ApiError } from "@/lib/api-client";

// Matches the backend's SLUG_PATTERN (create-program.dto.ts) exactly — no
// leading/trailing/doubled hyphens, so the form can't produce a slug the
// backend would then reject with a late 400.
const programSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and single hyphens (no leading, trailing, or double hyphens)",
    ),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  objectives: z.string().optional(),
  audience: z.string().optional(),
  impact: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormData = z.infer<typeof programSchema>;

interface ProgramFormProps {
  program?: ProgramAdmin;
  onSubmit: (data: ProgramWriteInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function ProgramForm({ program, onSubmit, onCancel, submitLabel = "Create Program" }: ProgramFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<MediaRef | null>(program?.heroImage ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(programSchema),
    defaultValues: program
      ? {
          slug: program.slug,
          title: program.title,
          description: program.description,
          objectives: program.objectives || "",
          audience: program.audience || "",
          impact: program.impact || "",
          ctaLabel: program.ctaLabel || "",
          ctaUrl: program.ctaUrl || "",
        }
      : {
          slug: "",
          title: "",
          description: "",
          objectives: "",
          audience: "",
          impact: "",
          ctaLabel: "",
          ctaUrl: "",
        },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      // @IsUrl rejects "" outright — only @IsOptional() skips undefined/null.
      await onSubmit({
        slug: data.slug,
        title: data.title,
        description: data.description,
        objectives: data.objectives || undefined,
        audience: data.audience || undefined,
        impact: data.impact || undefined,
        ctaLabel: data.ctaLabel || undefined,
        ctaUrl: data.ctaUrl || undefined,
        heroImageId: heroImage?.id ?? null,
      });
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

      <MediaPicker label="Hero Image" value={heroImage} onChange={setHeroImage} hint="Shown at the top of the program page" />

      <Input label="Slug" error={errors.slug?.message} {...register("slug")} hint="URL-friendly identifier (e.g., flagship-mentorship)" />
      <Input label="Title" error={errors.title?.message} {...register("title")} />
      <Textarea label="Description" error={errors.description?.message} {...register("description")} rows={4} />
      <Textarea label="Objectives" error={errors.objectives?.message} {...register("objectives")} rows={3} hint="Program goals and objectives" />
      <Textarea label="Target Audience" error={errors.audience?.message} {...register("audience")} rows={2} hint="Who this program is for" />
      <Textarea label="Impact" error={errors.impact?.message} {...register("impact")} rows={3} hint="Expected impact and outcomes" />
      <Input label="CTA Label" error={errors.ctaLabel?.message} {...register("ctaLabel")} hint="Button text (e.g., Apply Now)" />
      <Input label="CTA URL" error={errors.ctaUrl?.message} {...register("ctaUrl")} hint="Link for the call-to-action button" />

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
