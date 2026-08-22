"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { type Media } from "@/lib/api/media";
import { ApiError } from "@/lib/api-client";

const mediaEditSchema = z.object({
  altText: z.string().min(1, "Alt text is required for accessibility"),
});

type FormData = z.infer<typeof mediaEditSchema>;

interface MediaEditFormProps {
  media: Media;
  onSubmit: (data: { altText: string }) => Promise<void>;
  onCancel: () => void;
}

export function MediaEditForm({ media, onSubmit, onCancel }: MediaEditFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(mediaEditSchema),
    defaultValues: {
      altText: media.altText,
    },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await onSubmit({ altText: data.altText });
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

      {media.type === "IMAGE" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">Preview</label>
          <img src={media.secureUrl} alt={media.altText} className="h-32 w-32 rounded object-cover" />
        </div>
      )}

      <Input label="Alt Text" error={errors.altText?.message} {...register("altText")} hint="Required for accessibility" />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={status === "loading"}>
          Cancel
        </Button>
        <Button type="submit" disabled={status === "loading"} className="justify-center">
          {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Update
        </Button>
      </div>
    </form>
  );
}
