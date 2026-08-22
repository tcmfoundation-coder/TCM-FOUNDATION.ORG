"use client";

import { Button } from "../ui/button";
import { type ContactSubmission } from "@/lib/api/contact";

interface ContactSubmissionDetailProps {
  submission: ContactSubmission;
  onClose: () => void;
}

export function ContactSubmissionDetail({ submission, onClose }: ContactSubmissionDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-stone-700">From</p>
          <p className="text-stone-900">{submission.name}</p>
          <p className="text-sm text-stone-600">{submission.email}</p>
          {submission.phone && <p className="text-sm text-stone-600">{submission.phone}</p>}
          {submission.organization && <p className="text-sm text-stone-600">{submission.organization}</p>}
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Subject</p>
          <p className="text-stone-900">{submission.subject}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Message</p>
          <p className="whitespace-pre-wrap text-stone-900">{submission.message}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Received</p>
          <p className="text-sm text-stone-600">{new Date(submission.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
