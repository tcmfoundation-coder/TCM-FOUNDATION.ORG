"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { SOCIAL_LINK_PLATFORMS, type SocialLinkAdmin, type SocialLinkWriteInput } from "@/lib/api/social-links";
import { ApiError } from "@/lib/api-client";

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  twitter: "X (legacy)",
  tiktok: "TikTok",
};

const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_LINK_PLATFORMS),
  url: z.string().min(1, "URL is required").url("Enter a valid URL"),
  order: z.coerce.number().int(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof socialLinkSchema>;

interface SocialLinkFormProps {
  link?: SocialLinkAdmin;
  onSubmit: (data: SocialLinkWriteInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function SocialLinkForm({ link, onSubmit, onCancel, submitLabel = "Add Social Link" }: SocialLinkFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(socialLinkSchema),
    defaultValues: link
      ? { platform: link.platform as FormData["platform"], url: link.url, order: link.order, isActive: link.isActive }
      : { platform: SOCIAL_LINK_PLATFORMS[0], url: "", order: 0, isActive: true },
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

      <Select label="Platform" error={errors.platform?.message} {...register("platform")}>
        {SOCIAL_LINK_PLATFORMS.map((platform) => (
          <option key={platform} value={platform}>
            {PLATFORM_LABELS[platform]}
          </option>
        ))}
      </Select>

      <Input label="URL" error={errors.url?.message} hint="https://..." {...register("url")} />
      <Input label="Order" type="number" error={errors.order?.message} hint="Lower numbers appear first" {...register("order")} />

      <label className="flex items-center gap-2 text-sm text-stone-800">
        <input
          type="checkbox"
          {...register("isActive")}
          className="size-4 rounded-sm border-stone-300 text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
        />
        Active — shown in the public site footer
      </label>

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
