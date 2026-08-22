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
import { MediaPicker } from "./media-picker";
import { type TeamMemberAdmin, type TeamMemberWriteInput } from "@/lib/api/team";
import type { MediaRef } from "@/lib/api/media-ref";
import { ApiError } from "@/lib/api-client";

const teamMemberSchema = z.object({
  kind: z.enum(["TEAM", "BOARD", "ADVISORY"]),
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof teamMemberSchema>;

interface TeamFormProps {
  member?: TeamMemberAdmin;
  onSubmit: (data: TeamMemberWriteInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function TeamForm({ member, onSubmit, onCancel, submitLabel = "Create Member" }: TeamFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<MediaRef | null>(member?.photo ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: member
      ? {
          kind: member.kind,
          name: member.name,
          title: member.title,
          bio: member.bio || "",
        }
      : {
          kind: "TEAM",
          name: "",
          title: "",
          bio: "",
        },
  });

  async function handleFormSubmit(data: FormData) {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await onSubmit({ ...data, photoId: photo?.id ?? null });
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

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Kind</label>
        <select
          {...register("kind")}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="TEAM">Team</option>
          <option value="BOARD">Board</option>
          <option value="ADVISORY">Advisory</option>
        </select>
        {errors.kind && <p className="mt-1 text-xs text-error">{errors.kind.message}</p>}
      </div>

      <MediaPicker label="Photo" value={photo} onChange={setPhoto} />

      <Input label="Name" error={errors.name?.message} {...register("name")} />
      <Input label="Title" error={errors.title?.message} {...register("title")} />
      <Textarea label="Bio" error={errors.bio?.message} {...register("bio")} rows={4} hint="Brief biography" />

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
