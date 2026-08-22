"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ErrorState } from "../ui/error-state";
import {
  getApplicationSubmission,
  updateApplicationSubmissionStatus,
  type ApplicationSubmissionDetail as SubmissionDetail,
  type ApplicationSubmissionReviewStatus,
} from "@/lib/api/call-for-applications";
import { ApiError } from "@/lib/api-client";

const STATUS_LABELS: Record<ApplicationSubmissionReviewStatus, string> = {
  NEW: "New",
  IN_REVIEW: "In Review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

const STATUS_TONES: Record<ApplicationSubmissionReviewStatus, "neutral" | "brand"> = {
  NEW: "brand",
  IN_REVIEW: "neutral",
  ACCEPTED: "brand",
  REJECTED: "neutral",
};

const STATUS_OPTIONS: ApplicationSubmissionReviewStatus[] = ["NEW", "IN_REVIEW", "ACCEPTED", "REJECTED"];

export function ApplicationSubmissionDetail({
  submissionId,
  onStatusUpdated,
  onClose,
}: {
  submissionId: string;
  onStatusUpdated: (id: string, reviewStatus: ApplicationSubmissionReviewStatus) => void;
  onClose: () => void;
}) {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationSubmissionReviewStatus>("NEW");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await getApplicationSubmission(submissionId);
        if (cancelled) return;
        setSubmission(result);
        setNewStatus(result.reviewStatus);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load submission.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  async function handleUpdateStatus() {
    if (!submission || newStatus === submission.reviewStatus || statusLoading) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const updated = await updateApplicationSubmissionStatus(submission.id, newStatus);
      setSubmission({
        ...submission,
        reviewStatus: updated.reviewStatus,
        reviewedBy: updated.reviewedBy,
        reviewedById: updated.reviewedById,
      });
      onStatusUpdated(submission.id, updated.reviewStatus);
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 aria-hidden="true" className="size-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error || !submission) {
    return <ErrorState title="Couldn't load submission" description={error ?? undefined} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone={STATUS_TONES[submission.reviewStatus]}>{STATUS_LABELS[submission.reviewStatus]}</Badge>
        <div className="flex items-center gap-2">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ApplicationSubmissionReviewStatus)}
            disabled={statusLoading}
            className="rounded-sm border border-stone-300 px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-700"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {newStatus !== submission.reviewStatus && (
            <Button size="sm" onClick={() => void handleUpdateStatus()} disabled={statusLoading}>
              {statusLoading && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              Update Status
            </Button>
          )}
        </div>
      </div>

      {statusError && <p className="text-sm text-error">{statusError}</p>}

      <div className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Campaign</p>
          <p className="text-stone-900">{submission.callForApplication.title}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Applicant</p>
          <p className="text-stone-900">{submission.applicantName}</p>
          <p className="text-sm text-stone-600">{submission.applicantEmail}</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-200 pt-4">
          {submission.answers.map((answer) => (
            <div key={answer.fieldId}>
              <p className="text-sm font-medium text-stone-700">{answer.label}</p>
              <p className="whitespace-pre-wrap text-sm text-stone-900">
                {Array.isArray(answer.value) ? answer.value.join(", ") || "—" : answer.value || "—"}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Reviewer</p>
          <p className="text-sm text-stone-600">{submission.reviewedBy?.email ?? "Not yet reviewed"}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Submitted</p>
          <p className="text-sm text-stone-600">{new Date(submission.submittedAt).toLocaleString()}</p>
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
