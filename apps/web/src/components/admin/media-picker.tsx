"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { FileText, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { uploadMedia } from "@/lib/api/media";
import { ApiError } from "@/lib/api-client";
import type { MediaRef } from "@/lib/api/media-ref";

// Mirrors apps/api/src/modules/media/media.constants.ts, restricted to the
// IMAGE mime types only. Every content relation this component is used for
// (heroImage/photo/logo/coverImage) requires Media.type === "IMAGE" — each
// content service's assertMediaReferences() rejects anything else server
// side, so there's no point letting a PDF/video past client validation.
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

// Document mime types, for mode="file" (e.g. Downloadable Resources, which
// require Media.type === "DOCUMENT" server side).
const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_BYTES = 15 * 1024 * 1024; // matches MAX_MEDIA_UPLOAD_BYTES (apps/api)

interface PendingUpload {
  file: File;
  previewUrl: string;
  altText: string;
}

type PickerStatus = "idle" | "selected" | "uploading" | "error";

export interface MediaPickerProps {
  /** Field label, e.g. "Hero Image" or "Logo". */
  label: string;
  /** The currently persisted media for this field, or null if unset. */
  value: MediaRef | null;
  /** Called with the newly uploaded media, or null when cleared. */
  onChange: (media: MediaRef | null) => void;
  hint?: string;
  /** Form-level validation error (e.g. "Image is required"). */
  error?: string;
  /**
   * "image" (default) accepts image mime types and previews with <img>.
   * "file" accepts document mime types (PDF/Word) and previews with a
   * generic file icon + name, for relations like Download.file that
   * require Media.type === "DOCUMENT" server side.
   */
  mode?: "image" | "file";
}

// Uploads eagerly to the real POST /media/upload endpoint as soon as the
// admin confirms alt text — there is no combined "create content + upload
// file" endpoint (every content DTO only accepts an existing media id), so
// upload-then-reference is the only flow the backend supports. A picked
// file that never gets attached to content simply remains a normal,
// deletable Media Library entry — the same as uploading directly from
// /admin/media — rather than a broken half-created record anywhere.
export function MediaPicker({ label, value, onChange, hint, error, mode = "image" }: MediaPickerProps) {
  const [status, setStatus] = useState<PickerStatus>("idle");
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = mode === "file" ? ACCEPTED_DOCUMENT_TYPES : ACCEPTED_IMAGE_TYPES;
  const acceptAttr = acceptedTypes.join(",");
  const typesHint = mode === "file" ? "PDF or Word document" : "JPEG, PNG, WebP, GIF, or SVG";

  // Release the local blob URL once it's no longer being shown, so picking
  // through several files before confirming doesn't leak memory.
  useEffect(() => {
    if (!pending) return;
    const url = pending.previewUrl;
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  function validateFile(file: File): string | null {
    if (!acceptedTypes.includes(file.type)) {
      return `Unsupported file type. Use ${typesHint}.`;
    }
    if (file.size > MAX_BYTES) {
      return "File is too large. Maximum size is 15MB.";
    }
    return null;
  }

  function selectFile(file: File) {
    const validationError = validateFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPending({ file, previewUrl, altText: "" });
    if (validationError) {
      setErrorMessage(validationError);
      setStatus("error");
    } else {
      setErrorMessage(null);
      setStatus("selected");
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) selectFile(file);
    event.target.value = ""; // allow re-selecting the same file later
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file);
  }

  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  async function handleUpload() {
    if (!pending || !pending.altText.trim() || status === "uploading") return;
    setStatus("uploading");
    setErrorMessage(null);
    try {
      const media = await uploadMedia(pending.file, pending.altText.trim());
      onChange(media);
      setPending(null);
      setStatus("idle");
    } catch (uploadError) {
      setErrorMessage(uploadError instanceof ApiError ? uploadError.message : "Upload failed. Please try again.");
      setStatus("error");
    }
  }

  function handleCancelPending() {
    setPending(null);
    setErrorMessage(null);
    setStatus("idle");
  }

  function handleRemoveExisting() {
    onChange(null);
  }

  const showingExisting = !pending && value !== null;
  const showingDropzone = !pending && value === null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-stone-800">{label}</span>

      {showingExisting && value && (
        <div className="flex items-start gap-4 rounded-sm border border-stone-300 p-3">
          {mode === "file" ? (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-sm bg-stone-100">
              <FileText className="size-8 text-stone-400" aria-hidden="true" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- previewing an arbitrary Cloudinary-hosted image, not a static asset
            <img src={value.secureUrl} alt={value.altText} className="h-24 w-24 shrink-0 rounded-sm object-cover" />
          )}
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm text-stone-600">{value.altText}</p>
            {mode === "file" && (
              <a
                href={value.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-700 hover:text-brand-800"
              >
                View current file
              </a>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveExisting}>
                <X className="size-4" aria-hidden="true" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {showingDropzone && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleDropzoneKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Upload ${label}`}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragActive ? "border-brand-600 bg-brand-50" : "border-stone-300 hover:border-brand-400"
          }`}
        >
          {mode === "file" ? (
            <Upload className="size-6 text-stone-400" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-6 text-stone-400" aria-hidden="true" />
          )}
          <p className="text-sm text-stone-600">
            <span className="font-medium text-brand-700">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-stone-400">{typesHint} — up to 15MB</p>
        </div>
      )}

      {pending && (
        <div className="flex flex-col gap-3 rounded-sm border border-stone-300 p-3">
          <div className="flex items-start gap-4">
            <div className="relative h-24 w-24 shrink-0">
              {mode === "file" ? (
                <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-sm bg-stone-100 px-1 text-center">
                  <FileText className="size-8 text-stone-400" aria-hidden="true" />
                  <span className="w-full truncate text-[10px] text-stone-500">{pending.file.name}</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview of a not-yet-uploaded file
                <img src={pending.previewUrl} alt="Selected image preview" className="h-24 w-24 rounded-sm object-cover" />
              )}
              {status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-stone-900/50">
                  <Loader2 className="size-6 animate-spin text-white" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-stone-700">
                  {mode === "file" ? "Description (required)" : "Alt text (required)"}
                </span>
                <input
                  type="text"
                  value={pending.altText}
                  disabled={status === "uploading"}
                  onChange={(event) =>
                    setPending((current) => (current ? { ...current, altText: event.target.value } : current))
                  }
                  className="rounded-sm border border-stone-300 px-3 py-2 text-sm text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
                  placeholder={mode === "file" ? "Describe this file" : "Describe the image for accessibility"}
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={status === "uploading" || !pending.altText.trim()}
                  onClick={() => void handleUpload()}
                >
                  {status === "uploading" ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="size-4" aria-hidden="true" />
                  )}
                  {status === "uploading" ? "Uploading…" : status === "error" ? "Retry Upload" : "Upload"}
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={status === "uploading"} onClick={handleCancelPending}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
          {status === "error" && errorMessage && <Alert variant="error">{errorMessage}</Alert>}
        </div>
      )}

      <input ref={inputRef} type="file" accept={acceptAttr} onChange={handleInputChange} className="hidden" />

      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
