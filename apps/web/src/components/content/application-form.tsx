"use client";

import { useMemo, useState } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { TurnstileWidget } from "../ui/turnstile-widget";
import { submitApplication, type ApplicationField, type SubmitApplicationInput } from "@/lib/api/call-for-applications";
import { ApiError } from "@/lib/api-client";

type Status = "idle" | "loading" | "success" | "server-error";

type FormValues = {
  applicantName: string;
  applicantEmail: string;
  answers: Record<string, string | string[]>;
  consentedToContact: boolean;
};

// Every ApplicationField.fieldType maps to exactly one of these — no field
// type is invented beyond what the Prisma enum (and thus the backend
// validator) actually defines.
function buildFieldSchema(field: ApplicationField): z.ZodTypeAny {
  const options = field.options ?? [];
  switch (field.fieldType) {
    case "EMAIL": {
      const base = field.isRequired
        ? z.string().min(1, `${field.label} is required`).email(`Enter a valid email address for "${field.label}"`)
        : z.string().email(`Enter a valid email address for "${field.label}"`);
      return field.isRequired ? base : z.union([base, z.literal("")]);
    }
    case "SINGLE_SELECT": {
      const base = field.isRequired
        ? z.string().min(1, `${field.label} is required`)
        : z.string();
      return base.refine((value) => value === "" || options.includes(value), {
        message: `Choose a valid option for "${field.label}"`,
      });
    }
    case "MULTI_SELECT": {
      const base = field.isRequired
        ? z.array(z.string()).min(1, `Select at least one option for "${field.label}"`)
        : z.array(z.string());
      return base.refine((values) => values.every((value) => options.includes(value)), {
        message: `Invalid selection for "${field.label}"`,
      });
    }
    case "SHORT_TEXT":
    case "LONG_TEXT":
    case "PHONE":
    default: {
      const base = z.string();
      return field.isRequired ? base.min(1, `${field.label} is required`) : base;
    }
  }
}

function buildSchema(fields: ApplicationField[]) {
  const answersShape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    answersShape[field.id] = buildFieldSchema(field);
  }
  return z.object({
    applicantName: z.string().min(1, "Full name is required"),
    applicantEmail: z.string().min(1, "Email address is required").email("Enter a valid email address"),
    answers: z.object(answersShape),
    // Must be exactly true. An unticked box fails validation, so the form
    // never reaches the submit handler and nothing is sent.
    consentedToContact: z.boolean().refine((value) => value === true, {
      message: "Please confirm you agree before submitting your application.",
    }),
  });
}

function fieldLabel(field: ApplicationField): string {
  return field.isRequired ? `${field.label} *` : `${field.label} (optional)`;
}

function ApplicationFieldInput({
  field,
  register,
  error,
}: {
  field: ApplicationField;
  register: UseFormRegister<FormValues>;
  error?: string;
}) {
  const name = `answers.${field.id}` as const;
  const options = field.options ?? [];

  switch (field.fieldType) {
    case "LONG_TEXT":
      return <Textarea label={fieldLabel(field)} error={error} {...register(name)} />;
    case "EMAIL":
      return <Input label={fieldLabel(field)} type="email" error={error} {...register(name)} />;
    case "PHONE":
      return <Input label={fieldLabel(field)} type="tel" error={error} {...register(name)} />;
    case "SINGLE_SELECT":
      return (
        <Select label={fieldLabel(field)} error={error} {...register(name)}>
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );
    case "MULTI_SELECT":
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-stone-800">{fieldLabel(field)}</legend>
          <div className="flex flex-col gap-2">
            {options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  value={option}
                  className="size-4 rounded-sm border-stone-300 text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
                  {...register(name)}
                />
                {option}
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
        </fieldset>
      );
    case "SHORT_TEXT":
    default:
      return <Input label={fieldLabel(field)} error={error} {...register(name)} />;
  }
}

export function ApplicationForm({ slug, fields }: { slug: string; fields: ApplicationField[] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const sortedFields = useMemo(() => [...fields].sort((a, b) => a.order - b.order), [fields]);
  const schema = useMemo(() => buildSchema(sortedFields), [sortedFields]);
  const defaultValues = useMemo<FormValues>(() => {
    const answers: Record<string, string | string[]> = {};
    for (const field of sortedFields) {
      answers[field.id] = field.fieldType === "MULTI_SELECT" ? [] : "";
    }
    return { applicantName: "", applicantEmail: "", answers, consentedToContact: false };
  }, [sortedFields]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const payload: SubmitApplicationInput = {
        applicantName: values.applicantName,
        applicantEmail: values.applicantEmail,
        answers: values.answers,
        consentedToContact: values.consentedToContact,
        ...(turnstileToken ? { turnstileToken } : {}),
      };
      await submitApplication(slug, payload);
      setStatus("success");
      reset();
    } catch (error) {
      setStatus("server-error");
      setErrorMessage(
        error instanceof ApiError ? error.message : "We couldn't submit your application right now. Please try again.",
      );
    }
  }

  if (status === "success") {
    return (
      <Alert variant="success">
        Thank you — your application has been received. TCM Foundation will review it and follow up by email.
      </Alert>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5" noValidate>
      {status === "server-error" && errorMessage && <Alert variant="error">{errorMessage}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full Name *" error={errors.applicantName?.message} {...register("applicantName")} />
        <Input
          label="Email Address *"
          type="email"
          error={errors.applicantEmail?.message}
          {...register("applicantEmail")}
        />
      </div>

      {sortedFields.map((field) => (
        <ApplicationFieldInput
          key={field.id}
          field={field}
          register={register}
          error={errors.answers?.[field.id]?.message as string | undefined}
        />
      ))}

      {/* Required consent. The checkbox is a real input with a `for`-linked
          label, so clicking the text toggles it and screen readers announce
          the full sentence as its name.

          The two links stop propagation: inside a label, a click on an anchor
          both follows the link AND toggles the checkbox, which would silently
          tick "I agree" for someone who only wanted to read the terms. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <input
            id="consent-to-contact"
            type="checkbox"
            aria-describedby={errors.consentedToContact ? "consent-to-contact-error" : undefined}
            aria-invalid={errors.consentedToContact ? true : undefined}
            className="mt-0.5 size-4 shrink-0 rounded-sm border-stone-300 text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
            {...register("consentedToContact")}
          />
          <label htmlFor="consent-to-contact" className="text-sm leading-relaxed text-stone-700">
            I agree to the{" "}
            <Link
              href="/terms"
              onClick={(event) => event.stopPropagation()}
              className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              Terms and Conditions
            </Link>{" "}
            and consent to TCM Foundation contacting me using the details I have provided about this application. *
          </label>
        </div>
        {errors.consentedToContact && (
          <p id="consent-to-contact-error" className="text-xs text-error">
            {errors.consentedToContact.message}
          </p>
        )}
      </div>

      <TurnstileWidget onToken={setTurnstileToken} />

      <Button type="submit" disabled={status === "loading"} className="w-fit">
        {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Submit Application
      </Button>
    </form>
  );
}
