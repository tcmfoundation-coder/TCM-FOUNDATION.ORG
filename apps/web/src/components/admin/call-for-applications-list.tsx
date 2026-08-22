"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Eye, ListChecks, ClipboardList, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Modal } from "../ui/modal";
import { DataTable, type Column } from "./data-table";
import { SearchFilterBar } from "./search-filter-bar";
import { ConfirmDialog } from "./confirm-dialog";
import { CallForApplicationForm } from "./call-for-application-form";
import { ErrorState } from "../ui/error-state";
import {
  listCallForApplicationsAdmin,
  deleteCallForApplication,
  createCallForApplication,
  updateCallForApplication,
  type CallForApplicationAdmin,
  type CallForApplicationWriteInput,
} from "@/lib/api/call-for-applications";
import { ApiError } from "@/lib/api-client";

const STATUS_LABELS: Record<CallForApplicationAdmin["status"], string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

const STATUS_TONES: Record<CallForApplicationAdmin["status"], "neutral" | "brand"> = {
  DRAFT: "neutral",
  OPEN: "brand",
  CLOSED: "neutral",
};

export function CallForApplicationsList() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CallForApplicationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; campaign: CallForApplicationAdmin | null }>({
    open: false,
    campaign: null,
  });
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CallForApplicationAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      setLoading(true);
      setError(null);
      const response = await listCallForApplicationsAdmin({ take: 100 });
      setCampaigns(response.items);
    } catch (err) {
      setError("Failed to load campaigns");
      console.error("Call for applications load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "" || campaign.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<CallForApplicationAdmin>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (_value, row) => (
        <div>
          <p className="font-medium text-stone-900">{row.title}</p>
          <p className="text-xs text-stone-500">{row.slug}</p>
        </div>
      ),
    },
    {
      key: "programType",
      label: "Program Type",
      render: (value) => <p className="text-sm text-stone-600">{String(value ?? "") || "—"}</p>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge tone={STATUS_TONES[value as CallForApplicationAdmin["status"]]}>
          {STATUS_LABELS[value as CallForApplicationAdmin["status"]]}
        </Badge>
      ),
    },
    {
      key: "fields",
      label: "Fields",
      render: (value) => <p className="text-sm text-stone-600">{(value as unknown[]).length}</p>,
    },
    {
      key: "openDate",
      label: "Open — Close",
      render: (_value, row) => (
        <p className="text-sm text-stone-600">
          {row.openDate ? new Date(row.openDate).toLocaleDateString() : "—"}
          {" – "}
          {row.closeDate ? new Date(row.closeDate).toLocaleDateString() : "—"}
        </p>
      ),
    },
  ];

  async function handleDelete(campaign: CallForApplicationAdmin) {
    try {
      setActionLoading(true);
      await deleteCallForApplication(campaign.id);
      setDeleteDialog({ open: false, campaign: null });
      await loadCampaigns();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to delete campaign: ${err.message}`);
      } else {
        setError("Failed to delete campaign");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreate(data: CallForApplicationWriteInput) {
    try {
      await createCallForApplication(data);
      setCreateFormOpen(false);
      await loadCampaigns();
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new Error("Failed to create campaign");
    }
  }

  async function handleUpdate(data: CallForApplicationWriteInput) {
    if (!editingCampaign) return;
    try {
      await updateCallForApplication(editingCampaign.id, data);
      setEditFormOpen(false);
      setEditingCampaign(null);
      await loadCampaigns();
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new Error("Failed to update campaign");
    }
  }

  function handleView(campaign: CallForApplicationAdmin) {
    router.push(`/call-for-applications/${campaign.slug}`);
  }

  function handleEdit(campaign: CallForApplicationAdmin) {
    setEditingCampaign(campaign);
    setEditFormOpen(true);
  }

  if (error) {
    return <ErrorState title="Error loading campaigns" description={error} onRetry={loadCampaigns} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-stone-600">Manage TCM&apos;s Call for Applications campaigns and review submissions.</p>
        <Button onClick={() => setCreateFormOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Create Campaign
        </Button>
      </div>

      <SearchFilterBar
        searchPlaceholder="Search campaigns..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "DRAFT", label: "Draft" },
              { value: "OPEN", label: "Open" },
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
        data={filteredCampaigns}
        loading={loading}
        empty={!loading && filteredCampaigns.length === 0}
        emptyTitle="No campaigns found"
        emptyDescription="Create your first call for applications to get started."
        emptyAction={
          <Button onClick={() => setCreateFormOpen(true)} size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Create Campaign
          </Button>
        }
        rowActions={(campaign) => (
          <>
            <Button variant="ghost" size="sm" title="View public page" onClick={() => handleView(campaign)}>
              <Eye className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEdit(campaign)}>
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Manage fields"
              onClick={() => router.push(`/admin/applications/${campaign.id}/fields`)}
            >
              <ListChecks className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="View submissions"
              onClick={() => router.push(`/admin/applications/${campaign.id}/submissions`)}
            >
              <ClipboardList className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Delete"
              onClick={() => setDeleteDialog({ open: true, campaign })}
            >
              <Trash2 className="size-4 text-error" />
            </Button>
          </>
        )}
      />

      <Modal open={createFormOpen} onClose={() => setCreateFormOpen(false)} title="Create Campaign">
        <CallForApplicationForm onSubmit={handleCreate} onCancel={() => setCreateFormOpen(false)} />
      </Modal>

      <Modal open={editFormOpen} onClose={() => setEditFormOpen(false)} title="Edit Campaign">
        {editingCampaign && (
          <CallForApplicationForm
            campaign={editingCampaign}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditFormOpen(false);
              setEditingCampaign(null);
            }}
            submitLabel="Update Campaign"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, campaign: null })}
        onConfirm={() => deleteDialog.campaign && handleDelete(deleteDialog.campaign)}
        title="Delete Campaign"
        message={`Are you sure you want to delete "${deleteDialog.campaign?.title}"? This will also delete its fields and submissions. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
