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
import { type ArticleAdmin, type ArticleWriteInput } from "@/lib/api/articles";
import type { MediaRef } from "@/lib/api/media-ref";
import { ApiError } from "@/lib/api-client";

const articleSchema = z.object({
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and single hyphens"),
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().optional(),
  body: z.string().min(1, "Body is required"),
});

type FormData = z.infer<typeof articleSchema>;

interface ArticleFormProps {
  article?: ArticleAdmin;
  onSubmit: (data: ArticleWriteInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function ArticleForm({ article, onSubmit, onCancel, submitLabel = "Create Article" }: ArticleFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<MediaRef | null>(article?.coverImage ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: article
      ? {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt || "",
          body: article.body,
        }
      : {
          slug: "",
          title: "",
          excerpt: "",
          body: "",
        },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await onSubmit({ ...data, coverImageId: coverImage?.id ?? null });
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

      <MediaPicker label="Featured Image" value={coverImage} onChange={setCoverImage} />

      <Input label="Slug" error={errors.slug?.message} {...register("slug")} hint="URL-friendly identifier (e.g., my-article)" />
      <Input label="Title" error={errors.title?.message} {...register("title")} />
      <Textarea label="Excerpt" error={errors.excerpt?.message} {...register("excerpt")} rows={2} hint="Brief summary for preview" />
      <Textarea label="Body" error={errors.body?.message} {...register("body")} rows={10} hint="Full article content" />

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
