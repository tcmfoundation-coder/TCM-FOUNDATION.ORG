"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { type SupportRequest, type SupportRequestStatus } from "@/lib/api/support";

interface SupportRequestDetailProps {
  request: SupportRequest;
  onUpdateStatus: (id: string, status: SupportRequestStatus) => Promise<void>;
  onAssignHandler: (id: string, handledById: string | null) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

export function SupportRequestDetail({ request, onUpdateStatus, onAssignHandler, onClose, loading }: SupportRequestDetailProps) {
  const [newStatus, setNewStatus] = useState<SupportRequestStatus>(request.status);

  async function handleStatusChange() {
    if (newStatus !== request.status) {
      await onUpdateStatus(request.id, newStatus);
    }
  }

  async function handleUnassign() {
    await onAssignHandler(request.id, null);
  }

  const statusColors: Record<SupportRequestStatus, "neutral" | "brand"> = {
    NEW: "brand",
    IN_PROGRESS: "neutral",
    RESOLVED: "brand",
    CLOSED: "neutral",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Badge tone={statusColors[request.status]}>{request.status}</Badge>
        <div className="flex items-center gap-2">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as SupportRequestStatus)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            disabled={loading}
          >
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          {newStatus !== request.status && (
            <Button size="sm" onClick={handleStatusChange} disabled={loading}>
              Update Status
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-stone-700">Service</p>
          <p className="text-stone-900">{request.service.name}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Requester</p>
          <p className="text-stone-900">{request.requesterName}</p>
          <p className="text-sm text-stone-600">{request.requesterEmail}</p>
          {request.requesterPhone && <p className="text-sm text-stone-600">{request.requesterPhone}</p>}
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Message</p>
          <p className="text-stone-900 whitespace-pre-wrap">{request.message}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Assigned To</p>
          {request.handledBy ? (
            <div className="flex items-center gap-2">
              <p className="text-stone-900">{request.handledBy.email}</p>
              <Button size="sm" variant="secondary" onClick={handleUnassign} disabled={loading}>
                Unassign
              </Button>
            </div>
          ) : (
            <p className="text-sm text-stone-600">Unassigned</p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Created</p>
          <p className="text-sm text-stone-600">{new Date(request.createdAt).toLocaleString()}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-stone-700">Last Updated</p>
          <p className="text-sm text-stone-600">{new Date(request.updatedAt).toLocaleString()}</p>
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
