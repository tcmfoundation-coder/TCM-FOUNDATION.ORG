"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { createStaffUser, type PrivilegedRole } from "@/lib/api/users";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  email: z.string().min(1, "Email address is required").email("Enter a valid email address"),
  initialRole: z.enum(["", "CONTENT_EDITOR", "ADMINISTRATOR", "SUPER_ADMINISTRATOR"]),
});
type FormValues = z.infer<typeof schema>;

// A temporary password the admin must hand the new staff member out of
// band (there's no invented delivery channel here — see the "never invent
// ... a credential" rule). Generated client-side with the Web Crypto RNG
// rather than asking the admin to type one, since a hand-typed "temporary"
// password tends to be weak and reused.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTemporaryPassword(length = 20): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join("");
}

export function CreateStaffUserForm({ onCreated }: { onCreated: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { initialRole: "" } });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    const temporaryPassword = generateTemporaryPassword();
    try {
      await createStaffUser({
        email: values.email,
        temporaryPassword,
        initialRole: values.initialRole ? (values.initialRole as PrivilegedRole) : undefined,
      });
      setCreated({ email: values.email, temporaryPassword });
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      if (!(error instanceof ApiError)) throw error;
    }
  }

  if (created) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success">Account created for {created.email}.</Alert>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-stone-800">Temporary password</p>
          <p className="text-xs text-stone-500">
            Share this with them directly — it won&apos;t be shown again. They&apos;ll need it to sign in and set up
            two-factor authentication.
          </p>
          <div className="flex items-center gap-2 rounded-sm border border-stone-300 bg-stone-50 px-3.5 py-2.5">
            <code className="flex-1 break-all text-sm text-stone-900">{created.temporaryPassword}</code>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(created.temporaryPassword)}
              aria-label="Copy temporary password"
              className="shrink-0 rounded-sm p-1 text-stone-500 hover:bg-stone-200"
            >
              <Copy aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
        <Button type="button" onClick={onCreated} className="justify-center">
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
      {status === "error" && <Alert variant="error">Couldn&apos;t create this account. The email may already be in use.</Alert>}

      <Input label="Email Address" type="email" error={errors.email?.message} {...register("email")} />

      <Select label="Initial Role (optional)" error={errors.initialRole?.message} {...register("initialRole")}>
        <option value="">No role yet</option>
        <option value="CONTENT_EDITOR">Content Editor</option>
        <option value="ADMINISTRATOR">Administrator</option>
        <option value="SUPER_ADMINISTRATOR">Super Administrator</option>
      </Select>

      <Button type="submit" disabled={status === "loading"} className="justify-center">
        {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Create Account
      </Button>
    </form>
  );
}
