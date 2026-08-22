"use client";

import { useState, useEffect } from "react";
import { DataTable, Column } from "./data-table";
import { SearchFilterBar } from "./search-filter-bar";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { ContactSubmissionDetail } from "./contact-submission-detail";
import { ErrorState } from "../ui/error-state";
import { listContactSubmissions, type ContactSubmission } from "@/lib/api/contact";

export function ContactSubmissionsList() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      setLoading(true);
      setError(null);
      const response = await listContactSubmissions({ take: 100 });
      setSubmissions(response.items);
    } catch (err) {
      setError("Failed to load contact submissions");
      console.error("Contact submissions load error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleView(submission: ContactSubmission) {
    setSelected(submission);
    setDetailModalOpen(true);
  }

  const filteredSubmissions = submissions.filter((submission) => {
    const query = searchQuery.toLowerCase();
    return (
      submission.name.toLowerCase().includes(query) ||
      submission.email.toLowerCase().includes(query) ||
      submission.subject.toLowerCase().includes(query) ||
      submission.message.toLowerCase().includes(query)
    );
  });

  const columns: Column<ContactSubmission>[] = [
    {
      key: "name",
      label: "From",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-medium text-stone-900">{row.name}</p>
          <p className="text-xs text-stone-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      render: (value, row) => <p className="text-sm text-stone-600">{row.subject}</p>,
    },
    {
      key: "createdAt",
      label: "Received",
      render: (value) => (
        <p className="text-sm text-stone-600">{new Date(String(value)).toLocaleDateString()}</p>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-stone-600">General inquiries submitted through the public Contact form.</p>

      {error ? (
        <ErrorState title="Couldn't load contact submissions" description={error} onRetry={loadSubmissions} />
      ) : (
        <>
          <SearchFilterBar
            searchPlaceholder="Search by name, email, subject, or message..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={[]}
            onClearFilters={() => setSearchQuery("")}
          />

          <DataTable
            columns={columns}
            data={filteredSubmissions}
            loading={loading}
            empty={!loading && filteredSubmissions.length === 0}
            emptyTitle="No contact submissions found"
            emptyDescription="Messages sent through the public Contact form will appear here."
            rowActions={(item) => (
              <Button variant="ghost" size="sm" title="View Details" onClick={() => handleView(item)}>
                View
              </Button>
            )}
          />
        </>
      )}

      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Contact Submission">
        {selected && <ContactSubmissionDetail submission={selected} onClose={() => setDetailModalOpen(false)} />}
      </Modal>
    </div>
  );
}
