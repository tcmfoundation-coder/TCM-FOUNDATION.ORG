"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { ErrorState } from "../ui/error-state";
import { DataTable, type Column } from "./data-table";
import { ApplicationSubmissionDetail } from "./application-submission-detail";
import {
  listApplicationSubmissions,
  getCallForApplicationById,
  type ApplicationSubmissionSummary,
  type ApplicationSubmissionReviewStatus,
  type CallForApplication,
} from "@/lib/api/call-for-applications";
import { ApiError } from "@/lib/api-client";

const TAKE = 25;

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

interface SubmissionsPage {
  items: ApplicationSubmissionSummary[];
  total: number;
  skip: number;
}

const EMPTY_PAGE: SubmissionsPage = { items: [], total: 0, skip: 0 };

export function ApplicationSubmissionsList({ callForApplicationId }: { callForApplicationId: string }) {
  const [campaign, setCampaign] = useState<CallForApplication | null>(null);
  const [page, setPage] = useState<SubmissionsPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    getCallForApplicationById(callForApplicationId)
      .then(setCampaign)
      .catch(() => {
        // Campaign context is a nice-to-have header — the submissions list
        // below has its own error state, so a failure here just falls back
        // to a generic heading rather than blocking the page.
      });
  }, [callForApplicationId]);

  async function loadSubmissions(nextSkip: number) {
    try {
      setLoading(true);
      setError(null);
      const result = await listApplicationSubmissions(callForApplicationId, { skip: nextSkip, take: TAKE });
      setPage({ items: result.items, total: result.total, skip: result.skip });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // This loader is also called from the pagination buttons and the retry
    // action below, not just here — the setState calls inside only ever run
    // after an `await`, never synchronously during this effect, so there's
    // no render-cascade risk despite the rule's shared-function heuristic.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSubmissions(0);
  }, [callForApplicationId]);

  function handleView(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function handleStatusUpdated(id: string, reviewStatus: ApplicationSubmissionReviewStatus) {
    setPage((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, reviewStatus } : item)),
    }));
  }

  const { items: submissions, total, skip } = page;
  const totalPages = Math.max(1, Math.ceil(total / TAKE));
  const currentPage = Math.floor(skip / TAKE) + 1;

  const columns: Column<ApplicationSubmissionSummary>[] = [
    {
      key: "applicantName",
      label: "Applicant",
      render: (_value, row) => (
        <div>
          <p className="font-medium text-stone-900">{row.applicantName}</p>
          <p className="text-xs text-stone-500">{row.applicantEmail}</p>
        </div>
      ),
    },
    {
      key: "reviewStatus",
      label: "Status",
      render: (value) => (
        <Badge tone={STATUS_TONES[value as ApplicationSubmissionReviewStatus]}>
          {STATUS_LABELS[value as ApplicationSubmissionReviewStatus]}
        </Badge>
      ),
    },
    {
      key: "reviewedBy",
      label: "Reviewer",
      render: (_value, row) => <p className="text-sm text-stone-600">{row.reviewedBy?.email ?? "Not yet reviewed"}</p>,
    },
    {
      key: "submittedAt",
      label: "Submitted",
      render: (value) => <p className="text-sm text-stone-600">{new Date(String(value)).toLocaleString()}</p>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-stone-900">
          {campaign?.title ?? "Application Submissions"}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Review applicants and update their status for this call for applications.
        </p>
      </div>

      {error ? (
        <ErrorState title="Couldn't load submissions" description={error} onRetry={() => void loadSubmissions(skip)} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={submissions}
            loading={loading}
            empty={!loading && submissions.length === 0}
            emptyTitle="No submissions yet"
            emptyDescription="Applications submitted for this campaign will appear here."
            rowActions={(item) => (
              <Button variant="ghost" size="sm" onClick={() => handleView(item.id)}>
                View
              </Button>
            )}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => void loadSubmissions(Math.max(0, skip - TAKE))}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Previous
              </Button>
              <p className="text-sm text-stone-600">
                Page {currentPage} of {totalPages}
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => void loadSubmissions(skip + TAKE)}
              >
                Next
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Submission Details">
        {selectedId && (
          <ApplicationSubmissionDetail
            submissionId={selectedId}
            onStatusUpdated={handleStatusUpdated}
            onClose={() => setDetailOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
