"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import { mfaLoginVerify } from "@/lib/api/auth";

const schema = z.object({
  code: z.string().length(6, "Enter the 6-digit code from your authenticator app"),
});

type FormValues = z.infer<typeof schema>;

export function MfaVerifyForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setStatus("loading");
    try {
      await mfaLoginVerify(values.code);
      router.push("/admin/dashboard");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {status === "error" && <Alert variant="error">Invalid or expired code. Please try again.</Alert>}

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
        <Input
          label="Authentication Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.code?.message}
          {...register("code")}
        />
        <Button type="submit" disabled={status === "loading"} className="justify-center">
          {status === "loading" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Verify
        </Button>
      </form>
    </div>
  );
}
