"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ErrorState } from "../ui/error-state";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { getSiteSettings, updateSiteSettings, type SiteSettings } from "@/lib/api/site-settings";
import { ApiError } from "@/lib/api-client";

// The five Advanced Configuration fields have no fixed shape (nothing on
// the public site reads them yet — see lib/api/site-settings.ts) so the
// only thing worth validating client-side is "valid JSON object, or left
// blank" — the same bar the backend's @IsObject() enforces.
const jsonObjectField = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value || value.trim() === "") return true;
      try {
        const parsed: unknown = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
      } catch {
        return false;
      }
    },
    { message: "Must be valid JSON (an object), or left blank" },
  );

// Blank string fields must be sent as null (clear the value), not "" — the
// backend's @IsUrl/@IsEmail validators reject an empty string outright,
// while @IsOptional() only skips null/undefined.
const settingsSchema = z.object({
  tagline: z.string().optional(),
  contactEmail: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  tcmTvUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  learningHubUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  donateUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  navigation: jsonObjectField,
  footer: jsonObjectField,
  newsletterConfig: jsonObjectField,
  tcmHubPopup: jsonObjectField,
  brandTokens: jsonObjectField,
});

type FormData = z.infer<typeof settingsSchema>;

// Backend stores these as Json?, null when unset — pretty-print for
// editing, and round-trip null back to "" so an untouched field doesn't
// register as dirty.
function toJsonText(value: unknown): string {
  return value === null || value === undefined ? "" : JSON.stringify(value, null, 2);
}

// Guarded by jsonObjectField's zod refine above, so this only ever runs on
// text already confirmed to be valid JSON or blank.
function parseJsonField(text: string | undefined): Record<string, unknown> | null {
  if (!text || text.trim() === "") return null;
  return JSON.parse(text) as Record<string, unknown>;
}

function toFormValues(settings: SiteSettings): FormData {
  return {
    tagline: settings.tagline ?? "",
    contactEmail: settings.contactEmail ?? "",
    contactPhone: settings.contactPhone ?? "",
    tcmTvUrl: settings.tcmTvUrl ?? "",
    learningHubUrl: settings.learningHubUrl ?? "",
    donateUrl: settings.donateUrl ?? "",
    navigation: toJsonText(settings.navigation),
    footer: toJsonText(settings.footer),
    newsletterConfig: toJsonText(settings.newsletterConfig),
    tcmHubPopup: toJsonText(settings.tcmHubPopup),
    brandTokens: toJsonText(settings.brandTokens),
  };
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await getSiteSettings();
      setSettings(data);
      reset(toFormValues(data));
    } catch (err) {
      setLoadError("Failed to load site settings");
      console.error("Site settings load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: FormData) {
    setSaveStatus("saving");
    setSaveErrorMessage(null);
    try {
      const updated = await updateSiteSettings({
        tagline: data.tagline || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        tcmTvUrl: data.tcmTvUrl || null,
        learningHubUrl: data.learningHubUrl || null,
        donateUrl: data.donateUrl || null,
        navigation: parseJsonField(data.navigation),
        footer: parseJsonField(data.footer),
        newsletterConfig: parseJsonField(data.newsletterConfig),
        tcmHubPopup: parseJsonField(data.tcmHubPopup),
        brandTokens: parseJsonField(data.brandTokens),
      });
      setSettings(updated);
      reset(toFormValues(updated));
      setSaveStatus("success");
    } catch (err) {
      setSaveStatus("error");
      setSaveErrorMessage(err instanceof ApiError ? err.message : "An unexpected error occurred");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-brand-600" aria-hidden="true" />
      </div>
    );
  }

  if (loadError || !settings) {
    return <ErrorState title="Couldn't load site settings" description={loadError ?? undefined} onRetry={loadSettings} />;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-stone-600">Navigation, footer, social links, and site details.</p>

      {saveStatus === "success" && <Alert variant="success">Settings saved.</Alert>}
      {saveStatus === "error" && <Alert variant="error">{saveErrorMessage}</Alert>}

      <SettingsSection title="Site">
        <Input label="Tagline" error={errors.tagline?.message} {...register("tagline")} />
        <Input label="Contact Email" type="email" error={errors.contactEmail?.message} {...register("contactEmail")} />
        <Input label="Contact Phone" error={errors.contactPhone?.message} {...register("contactPhone")} />
      </SettingsSection>

      <SettingsSection title="External Links" description="Left blank, the corresponding link is hidden on the public site rather than shown broken.">
        <Input label="TCM TV" hint="https://youtube.com/..." error={errors.tcmTvUrl?.message} {...register("tcmTvUrl")} />
        <Input label="Learning Hub" hint="https://..." error={errors.learningHubUrl?.message} {...register("learningHubUrl")} />
        <Input label="Donate" hint="https://..." error={errors.donateUrl?.message} {...register("donateUrl")} />
      </SettingsSection>

      <SettingsSection
        title="Advanced Configuration"
        description="Free-form JSON for navigation, footer, newsletter, and TCM Hub popup config. Nothing on the public site reads these yet, so there's no fixed shape — just valid JSON, or leave a field blank to clear it."
      >
        <Textarea
          label="Navigation"
          hint="Valid JSON object, or leave blank"
          rows={6}
          className="font-mono text-xs"
          error={errors.navigation?.message}
          {...register("navigation")}
        />
        <Textarea
          label="Footer"
          hint="Valid JSON object, or leave blank"
          rows={6}
          className="font-mono text-xs"
          error={errors.footer?.message}
          {...register("footer")}
        />
        <Textarea
          label="Newsletter Config"
          hint="Valid JSON object, or leave blank"
          rows={6}
          className="font-mono text-xs"
          error={errors.newsletterConfig?.message}
          {...register("newsletterConfig")}
        />
        <Textarea
          label="TCM Hub Popup"
          hint={'Advert shown on the public site. Keys: enabled (true/false), title, body, ctaLabel, url. Set enabled to false to retire it without losing the wording.'}
          rows={8}
          className="font-mono text-xs"
          error={errors.tcmHubPopup?.message}
          {...register("tcmHubPopup")}
        />
        <Textarea
          label="Brand Tokens"
          hint="Valid JSON object, or leave blank"
          rows={6}
          className="font-mono text-xs"
          error={errors.brandTokens?.message}
          {...register("brandTokens")}
        />
      </SettingsSection>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={!isDirty || saveStatus === "saving"} className="justify-center">
          {saveStatus === "saving" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-5 py-3">
        <h2 className="text-sm font-medium text-stone-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
      </div>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}
