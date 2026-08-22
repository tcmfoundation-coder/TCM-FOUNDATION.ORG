"use client";

import { useState, useEffect } from "react";
import { DataTable, Column } from "./data-table";
import { SearchFilterBar } from "./search-filter-bar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { SupportRequestDetail } from "./support-request-detail";
import { ErrorState } from "../ui/error-state";
import { showToast } from "../ui/toast";
import { ApiError } from "@/lib/api-client";
import {
  listSupportRequests,
  updateSupportRequestStatus,
  assignSupportRequestHandler,
  type SupportRequest,
  type SupportRequestStatus,
} from "@/lib/api/support";

export function SupportRequestsList() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      setError(null);
      const response = await listSupportRequests({ take: 100, status: filterStatus as SupportRequestStatus || undefined });
      setRequests(response.items);
    } catch (err) {
      setError("Failed to load support requests");
      console.error("Support requests load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(id: string, status: SupportRequestStatus) {
    try {
      setActionLoading(true);
      await updateSupportRequestStatus(id, status);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update the status. Please try again.", "error");
      // A 404 here means the request was deleted elsewhere since this list
      // last loaded — reload so the now-stale row doesn't linger.
      if (err instanceof ApiError && err.status === 404) setDetailModalOpen(false);
    } finally {
      setActionLoading(false);
      await loadRequests();
    }
  }

  async function handleAssignHandler(id: string, handledById: string | null) {
    try {
      setActionLoading(true);
      await assignSupportRequestHandler(id, handledById);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update the assignment. Please try again.", "error");
      if (err instanceof ApiError && err.status === 404) setDetailModalOpen(false);
    } finally {
      setActionLoading(false);
      await loadRequests();
    }
  }

  function handleView(request: SupportRequest) {
    setSelectedRequest(request);
    setDetailModalOpen(true);
  }

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requesterEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || request.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<SupportRequest>[] = [
    {
      key: "requesterName",
      label: "Requester",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-medium text-stone-900">{row.requesterName}</p>
          <p className="text-xs text-stone-500">{row.requesterEmail}</p>
        </div>
      ),
    },
    {
      key: "service",
      label: "Service",
      render: (value, row) => <p className="text-sm text-stone-600">{row.service.name}</p>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => {
        const statusColors: Record<SupportRequestStatus, "neutral" | "brand"> = {
          NEW: "brand",
          IN_PROGRESS: "neutral",
          RESOLVED: "brand",
          CLOSED: "neutral",
        };
        return <Badge tone={statusColors[value as SupportRequestStatus]}>{String(value)}</Badge>;
      },
    },
    {
      key: "createdAt",
      label: "Created",
      render: (value) => (
        <p className="text-sm text-stone-600">{new Date(String(value)).toLocaleDateString()}</p>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-stone-600">View and manage TCM Support Lab requests.</p>

      {error ? (
        <ErrorState title="Couldn't load support requests" description={error} onRetry={loadRequests} />
      ) : (
        <>
          <SearchFilterBar
            searchPlaceholder="Search by name, email, or message..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "NEW", label: "New" },
                  { value: "IN_PROGRESS", label: "In Progress" },
                  { value: "RESOLVED", label: "Resolved" },
                  { value: "CLOSED", label: "Closed" },
                ],
                value: filterStatus,
                onChange: setFilterStatus,
              },
            ]}
            onClearFilters={() => {
              setSearchQuery("");
              setFilterStatus("");
            }}
          />

          <DataTable
            columns={columns}
            data={filteredRequests}
            loading={loading}
            empty={!loading && filteredRequests.length === 0}
            emptyTitle="No support requests found"
            emptyDescription="Support requests will appear here when submitted."
            rowActions={(item) => (
              <Button variant="ghost" size="sm" title="View Details" onClick={() => handleView(item)}>
                View
              </Button>
            )}
          />
        </>
      )}

      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Support Request Details">
        {selectedRequest && (
          <SupportRequestDetail
            request={selectedRequest}
            onUpdateStatus={handleUpdateStatus}
            onAssignHandler={handleAssignHandler}
            onClose={() => setDetailModalOpen(false)}
            loading={actionLoading}
          />
        )}
      </Modal>
    </div>
  );
}
