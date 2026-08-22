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
import { type SupportService } from "@/lib/api/support";
import { ApiError } from "@/lib/api-client";

const supportServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
  order: z.coerce.number().int(),
});

type FormData = z.infer<typeof supportServiceSchema>;

interface SupportServiceFormProps {
  service?: SupportService;
  onSubmit: (data: Partial<SupportService>) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function SupportServiceForm({ service, onSubmit, onCancel, submitLabel = "Create Service" }: SupportServiceFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(supportServiceSchema),
    defaultValues: service
      ? {
          name: service.name,
          description: service.description || "",
          isActive: service.isActive,
          order: service.order,
        }
      : {
          name: "",
          description: "",
          isActive: true,
          order: 0,
        },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await onSubmit({
        name: data.name,
        description: data.description || undefined,
        isActive: data.isActive,
        order: data.order,
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

      <Input label="Name" error={errors.name?.message} {...register("name")} />
      <Textarea
        label="Description"
        error={errors.description?.message}
        hint="Shown to visitors on the public Support Lab booking page"
        {...register("description")}
      />
      <Input
        label="Order"
        type="number"
        error={errors.order?.message}
        hint="Lower numbers appear first"
        {...register("order")}
      />

      <label className="flex items-center gap-2 text-sm text-stone-800">
        <input
          type="checkbox"
          {...register("isActive")}
          className="size-4 rounded-sm border-stone-300 text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
        />
        Active — bookable on the public Support Lab page
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
