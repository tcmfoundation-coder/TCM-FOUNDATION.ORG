"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { uploadMedia } from "@/lib/api/media";
import { ApiError } from "@/lib/api-client";

const mediaUploadSchema = z.object({
  // A native file input's registered onChange gives react-hook-form a
  // FileList, not a single File — validate the FileList and transform it to
  // the single File the rest of the form (and the upload call) needs.
  file: z
    .instanceof(FileList, { message: "File is required" })
    .refine((list) => list.length > 0, { message: "File is required" })
    .transform((list) => list[0]),
  altText: z.string().min(1, "Alt text is required for accessibility"),
});

type FormInput = z.input<typeof mediaUploadSchema>;
type FormOutput = z.output<typeof mediaUploadSchema>;

interface MediaUploadFormProps {
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

export function MediaUploadForm({ onSubmit, onCancel }: MediaUploadFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(mediaUploadSchema),
  });

  const selectedFile = watch("file")?.[0];

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function handleFormSubmit(data: FormOutput) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await uploadMedia(data.file, data.altText);
      await onSubmit();
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

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">File</label>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/webm,video/quicktime"
            {...register("file")}
            className="block w-full text-sm text-stone-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
        </div>
        {errors.file && <p className="mt-1 text-xs text-error">{errors.file.message}</p>}
      </div>

      {previewUrl && (
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">Preview</label>
          <img src={previewUrl} alt="Preview" className="h-32 w-32 rounded object-cover" />
        </div>
      )}

      <Input label="Alt Text" error={errors.altText?.message} {...register("altText")} hint="Required for accessibility" />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={status === "loading"}>
          Cancel
        </Button>
        <Button type="submit" disabled={status === "loading"} className="justify-center">
          {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {status === "idle" && <Upload aria-hidden="true" className="size-4" />}
          Upload
        </Button>
      </div>
    </form>
  );
}
