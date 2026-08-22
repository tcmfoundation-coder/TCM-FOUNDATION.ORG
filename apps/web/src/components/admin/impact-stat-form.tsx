"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { type ImpactStatAdmin } from "@/lib/api/impact-stats";
import { ApiError } from "@/lib/api-client";

const impactStatSchema = z.object({
  label: z.string().min(1, "Label is required"),
  value: z.coerce.number().min(0, "Value must be a positive number"),
});

type FormData = z.infer<typeof impactStatSchema>;

interface ImpactStatFormProps {
  stat?: ImpactStatAdmin;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function ImpactStatForm({ stat, onSubmit, onCancel, submitLabel = "Create Stat" }: ImpactStatFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(impactStatSchema),
    defaultValues: stat
      ? {
          label: stat.label,
          value: stat.value,
        }
      : {
          label: "",
          value: 0,
        },
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

      <Input label="Label" error={errors.label?.message} {...register("label")} hint="e.g., Women Supported" />
      <Input label="Value" error={errors.value?.message} {...register("value")} type="number" hint="Numeric value" />

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
