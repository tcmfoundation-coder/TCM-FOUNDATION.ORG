"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { type CallForApplicationAdmin, type CallForApplicationWriteInput } from "@/lib/api/call-for-applications";
import { ApiError } from "@/lib/api-client";

// Matches the backend's SLUG_PATTERN (create-call-for-application.dto.ts)
// exactly — no leading/trailing/doubled hyphens.
const callForApplicationSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and single hyphens (no leading, trailing, or double hyphens)",
    ),
  title: z.string().min(1, "Title is required"),
  programType: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  openDate: z.string().optional(),
  closeDate: z.string().optional(),
});

type FormData = z.infer<typeof callForApplicationSchema>;

interface CallForApplicationFormProps {
  campaign?: CallForApplicationAdmin;
  onSubmit: (data: CallForApplicationWriteInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// Backend stores dates as full ISO DateTimes but <input type="date"> needs
// (and returns) just the YYYY-MM-DD portion.
function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function CallForApplicationForm({
  campaign,
  onSubmit,
  onCancel,
  submitLabel = "Create Campaign",
}: CallForApplicationFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(callForApplicationSchema),
    defaultValues: campaign
      ? {
          slug: campaign.slug,
          title: campaign.title,
          programType: campaign.programType || "",
          description: campaign.description || "",
          status: campaign.status,
          openDate: toDateInputValue(campaign.openDate),
          closeDate: toDateInputValue(campaign.closeDate),
        }
      : {
          slug: "",
          title: "",
          programType: "",
          description: "",
          status: "DRAFT",
          openDate: "",
          closeDate: "",
        },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await onSubmit({
        slug: data.slug,
        title: data.title,
        programType: data.programType || undefined,
        description: data.description || undefined,
        status: data.status,
        openDate: data.openDate || undefined,
        closeDate: data.closeDate || undefined,
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

      <Input label="Slug" error={errors.slug?.message} {...register("slug")} hint="URL-friendly identifier (e.g., 2026-mentorship-cohort)" />
      <Input label="Title" error={errors.title?.message} {...register("title")} />
      <Input label="Program Type" error={errors.programType?.message} {...register("programType")} hint="Optional — e.g., Mentorship, Grant, Fellowship" />
      <Textarea label="Description" error={errors.description?.message} {...register("description")} rows={4} />

      <Select label="Status" error={errors.status?.message} {...register("status")}>
        <option value="DRAFT">Draft</option>
        <option value="OPEN">Open</option>
        <option value="CLOSED">Closed</option>
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Open Date" type="date" error={errors.openDate?.message} {...register("openDate")} />
        <Input label="Close Date" type="date" error={errors.closeDate?.message} {...register("closeDate")} />
      </div>

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
