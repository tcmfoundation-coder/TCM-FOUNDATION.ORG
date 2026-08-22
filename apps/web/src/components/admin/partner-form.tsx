"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { MediaPicker } from "./media-picker";
import { type PartnerAdmin, type PartnerWriteInput } from "@/lib/api/partners";
import type { MediaRef } from "@/lib/api/media-ref";
import { ApiError } from "@/lib/api-client";

const partnerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type FormData = z.infer<typeof partnerSchema>;

interface PartnerFormProps {
  partner?: PartnerAdmin;
  onSubmit: (data: PartnerWriteInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function PartnerForm({ partner, onSubmit, onCancel, submitLabel = "Create Partner" }: PartnerFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logo, setLogo] = useState<MediaRef | null>(partner?.logo ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: partner
      ? {
          name: partner.name,
          websiteUrl: partner.websiteUrl || "",
        }
      : {
          name: "",
          websiteUrl: "",
        },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      // The backend's @IsUrl validator rejects an empty string outright —
      // only @IsOptional() skips undefined/null — so a blank field must be
      // sent as undefined, not "".
      await onSubmit({
        name: data.name,
        websiteUrl: data.websiteUrl || undefined,
        logoId: logo?.id ?? null,
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

      <MediaPicker label="Logo" value={logo} onChange={setLogo} />

      <Input label="Name" error={errors.name?.message} {...register("name")} />
      <Input label="Website URL" error={errors.websiteUrl?.message} {...register("websiteUrl")} hint="https://example.com" />

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
