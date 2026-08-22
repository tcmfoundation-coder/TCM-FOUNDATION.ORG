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
import { type DownloadAdmin, type DownloadWriteInput } from "@/lib/api/downloads";
import type { MediaRef } from "@/lib/api/media-ref";
import { ApiError } from "@/lib/api-client";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const downloadSchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(SLUG_PATTERN, "Use lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

type FormData = z.infer<typeof downloadSchema>;

interface DownloadFormProps {
  download?: DownloadAdmin;
  onSubmit: (data: DownloadWriteInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function DownloadForm({ download, onSubmit, onCancel, submitLabel = "Create Resource" }: DownloadFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [file, setFile] = useState<MediaRef | null>(download?.file ?? null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(downloadSchema),
    defaultValues: download
      ? {
          slug: download.slug,
          title: download.title,
          description: download.description || "",
        }
      : {
          slug: "",
          title: "",
          description: "",
        },
  });

  async function handleFormSubmit(data: FormData) {
    if (!file) {
      setFileError("A file is required");
      return;
    }
    setFileError(undefined);
    setStatus("loading");
    setErrorMessage(null);
    try {
      await onSubmit({
        slug: data.slug,
        title: data.title,
        description: data.description || undefined,
        fileId: file.id,
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

      <Input label="Title" error={errors.title?.message} {...register("title")} />
      <Input
        label="Slug"
        error={errors.slug?.message}
        hint="URL-friendly identifier (e.g., annual-impact-report-2026)"
        {...register("slug")}
      />
      <Textarea label="Description" error={errors.description?.message} {...register("description")} />

      <MediaPicker
        label="File"
        mode="file"
        value={file}
        onChange={(media) => {
          setFile(media);
          if (media) setFileError(undefined);
        }}
        error={fileError}
      />

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
