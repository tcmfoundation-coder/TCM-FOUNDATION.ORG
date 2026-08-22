"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, ClipboardList } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { ErrorState } from "../ui/error-state";
import { DataTable, type Column } from "./data-table";
import { ConfirmDialog } from "./confirm-dialog";
import { ApplicationFieldForm } from "./application-field-form";
import {
  getCallForApplicationById,
  listApplicationFields,
  createApplicationField,
  updateApplicationField,
  deleteApplicationField,
  type ApplicationField,
  type ApplicationFieldWriteInput,
  type CallForApplication,
} from "@/lib/api/call-for-applications";
import { ApiError } from "@/lib/api-client";

const FIELD_TYPE_LABELS: Record<ApplicationField["fieldType"], string> = {
  SHORT_TEXT: "Short Text",
  LONG_TEXT: "Long Text",
  EMAIL: "Email",
  PHONE: "Phone",
  SINGLE_SELECT: "Single Select",
  MULTI_SELECT: "Multi Select",
};

export function ApplicationFieldsManager({ callForApplicationId }: { callForApplicationId: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CallForApplication | null>(null);
  const [fields, setFields] = useState<ApplicationField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<ApplicationField | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; field: ApplicationField | null }>({
    open: false,
    field: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    getCallForApplicationById(callForApplicationId)
      .then(setCampaign)
      .catch(() => {
        // Campaign context is a nice-to-have header, same as the
        // submissions page — the fields list below has its own error state.
      });
  }, [callForApplicationId]);

  async function loadFields() {
    try {
      setLoading(true);
      setError(null);
      const items = await listApplicationFields(callForApplicationId);
      setFields(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load application fields");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFields();
  }, [callForApplicationId]);

  async function handleCreate(data: ApplicationFieldWriteInput) {
    try {
      await createApplicationField(callForApplicationId, data);
      setCreateFormOpen(false);
      await loadFields();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error("Failed to create field");
    }
  }

  async function handleUpdate(data: ApplicationFieldWriteInput) {
    if (!editingField) return;
    try {
      await updateApplicationField(editingField.id, data);
      setEditFormOpen(false);
      setEditingField(null);
      await loadFields();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new Error("Failed to update field");
    }
  }

  async function handleDelete(field: ApplicationField) {
    try {
      setActionLoading(true);
      await deleteApplicationField(field.id);
      setDeleteDialog({ open: false, field: null });
      await loadFields();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete field");
    } finally {
      setActionLoading(false);
    }
  }

  function handleEdit(field: ApplicationField) {
    setEditingField(field);
    setEditFormOpen(true);
  }

  const columns: Column<ApplicationField>[] = [
    {
      key: "order",
      label: "#",
      render: (value) => <p className="text-sm text-stone-500">{String(value)}</p>,
    },
    {
      key: "label",
      label: "Label",
      render: (value) => <p className="font-medium text-stone-900">{String(value)}</p>,
    },
    {
      key: "fieldType",
      label: "Type",
      render: (value) => <Badge tone="neutral">{FIELD_TYPE_LABELS[value as ApplicationField["fieldType"]]}</Badge>,
    },
    {
      key: "isRequired",
      label: "Required",
      render: (value) => <Badge tone={value ? "brand" : "neutral"}>{value ? "Required" : "Optional"}</Badge>,
    },
    {
      key: "options",
      label: "Options",
      render: (value) => <p className="max-w-xs truncate text-sm text-stone-600">{(value as string[] | null)?.join(", ") || "—"}</p>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-medium text-stone-900">
            {campaign?.title ?? "Application Fields"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Define the questions applicants must answer for this campaign.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/admin/applications/${callForApplicationId}/submissions`)}
          >
            <ClipboardList className="size-4" aria-hidden="true" />
            View Submissions
          </Button>
          <Button size="sm" onClick={() => setCreateFormOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add Field
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState title="Couldn't load fields" description={error} onRetry={loadFields} />
      ) : (
        <DataTable
          columns={columns}
          data={fields}
          loading={loading}
          empty={!loading && fields.length === 0}
          emptyTitle="No fields yet"
          emptyDescription="Add a field to start building this campaign's application form."
          emptyAction={
            <Button onClick={() => setCreateFormOpen(true)} size="sm">
              <Plus className="size-4" aria-hidden="true" />
              Add Field
            </Button>
          }
          rowActions={(field) => (
            <>
              <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEdit(field)}>
                <Edit className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Delete" onClick={() => setDeleteDialog({ open: true, field })}>
                <Trash2 className="size-4 text-error" />
              </Button>
            </>
          )}
        />
      )}

      <Modal open={createFormOpen} onClose={() => setCreateFormOpen(false)} title="Add Field">
        <ApplicationFieldForm onSubmit={handleCreate} onCancel={() => setCreateFormOpen(false)} />
      </Modal>

      <Modal open={editFormOpen} onClose={() => setEditFormOpen(false)} title="Edit Field">
        {editingField && (
          <ApplicationFieldForm
            field={editingField}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditFormOpen(false);
              setEditingField(null);
            }}
            submitLabel="Update Field"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, field: null })}
        onConfirm={() => deleteDialog.field && handleDelete(deleteDialog.field)}
        title="Delete Field"
        message={`Are you sure you want to delete "${deleteDialog.field?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
