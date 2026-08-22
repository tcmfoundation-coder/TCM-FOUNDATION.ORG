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
import { type ApplicationField, type ApplicationFieldWriteInput } from "@/lib/api/call-for-applications";
import { ApiError } from "@/lib/api-client";

const FIELD_TYPE_LABELS: Record<ApplicationField["fieldType"], string> = {
  SHORT_TEXT: "Short Text",
  LONG_TEXT: "Long Text",
  EMAIL: "Email",
  PHONE: "Phone",
  SINGLE_SELECT: "Single Select",
  MULTI_SELECT: "Multi Select",
};

const SELECT_TYPES = new Set<ApplicationField["fieldType"]>(["SINGLE_SELECT", "MULTI_SELECT"]);

const fieldSchema = z
  .object({
    label: z.string().min(1, "Label is required"),
    fieldType: z.enum(["SHORT_TEXT", "LONG_TEXT", "EMAIL", "PHONE", "SINGLE_SELECT", "MULTI_SELECT"]),
    isRequired: z.boolean(),
    optionsText: z.string().optional(),
    order: z.coerce.number().int(),
  })
  .refine(
    (data) => !SELECT_TYPES.has(data.fieldType) || (data.optionsText ?? "").trim().length > 0,
    { message: "Provide at least one option, one per line", path: ["optionsText"] },
  );

type FormData = z.infer<typeof fieldSchema>;

interface ApplicationFieldFormProps {
  field?: ApplicationField;
  onSubmit: (data: ApplicationFieldWriteInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function ApplicationFieldForm({ field, onSubmit, onCancel, submitLabel = "Add Field" }: ApplicationFieldFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: field
      ? {
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          optionsText: (field.options ?? []).join("\n"),
          order: field.order,
        }
      : {
          label: "",
          fieldType: "SHORT_TEXT",
          isRequired: true,
          optionsText: "",
          order: 0,
        },
  });

  const fieldType = watch("fieldType");
  const showOptions = SELECT_TYPES.has(fieldType);

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const options = showOptions
        ? data.optionsText
            ?.split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        : undefined;

      await onSubmit({
        label: data.label,
        fieldType: data.fieldType,
        isRequired: data.isRequired,
        options,
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

      <Input label="Label" error={errors.label?.message} {...register("label")} hint="The question shown to applicants" />

      <Select label="Field Type" error={errors.fieldType?.message} {...register("fieldType")}>
        {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>

      {showOptions && (
        <Textarea
          label="Options"
          error={errors.optionsText?.message}
          {...register("optionsText")}
          rows={4}
          hint="One option per line"
        />
      )}

      <Input label="Order" type="number" error={errors.order?.message} hint="Lower numbers appear first" {...register("order")} />

      <label className="flex items-center gap-2 text-sm text-stone-800">
        <input
          type="checkbox"
          {...register("isRequired")}
          className="size-4 rounded-sm border-stone-300 text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
        />
        Required — applicants must answer this question
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
