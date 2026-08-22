"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Eye, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Modal } from "../ui/modal";
import { DataTable, Column } from "./data-table";
import { SearchFilterBar } from "./search-filter-bar";
import { ConfirmDialog } from "./confirm-dialog";
import { ProgramForm } from "./program-form";
import { ErrorState } from "../ui/error-state";
import {
  listProgramsAdmin,
  deleteProgram,
  publishProgram,
  createProgram,
  updateProgram,
  type ProgramAdmin,
  type ProgramWriteInput,
} from "@/lib/api/programs";
import { ApiError } from "@/lib/api-client";

export function ProgramsList() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; program: ProgramAdmin | null }>({
    open: false,
    program: null,
  });
  const [publishDialog, setPublishDialog] = useState<{ open: boolean; program: ProgramAdmin | null; publish: boolean }>({
    open: false,
    program: null,
    publish: true,
  });
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      setLoading(true);
      setError(null);
      const response = await listProgramsAdmin({ take: 100 });
      setPrograms(response.items);
    } catch (err) {
      setError("Failed to load programs");
      console.error("Programs load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "" ||
      (filterStatus === "published" && program.isPublished) ||
      (filterStatus === "draft" && !program.isPublished);
    return matchesSearch && matchesStatus;
  });

  const columns: Column<ProgramAdmin>[] = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-medium text-stone-900">{row.title}</p>
          <p className="text-xs text-stone-500">{row.slug}</p>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (value) => (
        <p className="max-w-xs truncate text-sm text-stone-600">{String(value ?? "")}</p>
      ),
    },
    {
      key: "isPublished",
      label: "Status",
      render: (value) => (
        <Badge tone={value ? "neutral" : "brand"}>{value ? "Published" : "Draft"}</Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (value) => (
        <p className="text-sm text-stone-600">{new Date(String(value)).toLocaleDateString()}</p>
      ),
    },
  ];

  async function handleDelete(program: ProgramAdmin) {
    try {
      setActionLoading(true);
      await deleteProgram(program.id);
      setDeleteDialog({ open: false, program: null });
      await loadPrograms();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to delete program: ${err.message}`);
      } else {
        setError("Failed to delete program");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish(program: ProgramAdmin, publish: boolean) {
    try {
      setActionLoading(true);
      await publishProgram(program.id, publish);
      setPublishDialog({ open: false, program: null, publish: true });
      await loadPrograms();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to ${publish ? "publish" : "unpublish"} program: ${err.message}`);
      } else {
        setError(`Failed to ${publish ? "publish" : "unpublish"} program`);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreate(data: ProgramWriteInput) {
    try {
      await createProgram(data);
      setCreateFormOpen(false);
      await loadPrograms();
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new Error("Failed to create program");
    }
  }

  async function handleUpdate(data: ProgramWriteInput) {
    if (!editingProgram) return;
    try {
      await updateProgram(editingProgram.id, data);
      setEditFormOpen(false);
      setEditingProgram(null);
      await loadPrograms();
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new Error("Failed to update program");
    }
  }

  function handleView(program: ProgramAdmin) {
    router.push(`/programs/${program.slug}`);
  }

  function handleEdit(program: ProgramAdmin) {
    setEditingProgram(program);
    setEditFormOpen(true);
  }

  if (error) {
    return <ErrorState title="Error loading programs" description={error} onRetry={loadPrograms} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-stone-600">Manage Flagship Impact Programs</p>
        <Button onClick={() => setCreateFormOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Create Program
        </Button>
      </div>

      <SearchFilterBar
        searchPlaceholder="Search programs..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
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
        data={filteredPrograms}
        loading={loading}
        empty={!loading && filteredPrograms.length === 0}
        emptyTitle="No programs found"
        emptyDescription="Create your first program to get started."
        emptyAction={
          <Button onClick={() => setCreateFormOpen(true)} size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Create Program
          </Button>
        }
        rowActions={(program) => (
          <>
            <Button variant="ghost" size="sm" title="View" onClick={() => handleView(program)}>
              <Eye className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEdit(program)}>
              <Edit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={program.isPublished ? "Unpublish" : "Publish"}
              onClick={() => setPublishDialog({ open: true, program, publish: !program.isPublished })}
            >
              {program.isPublished ? <PowerOff className="size-4" /> : <Power className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Delete"
              onClick={() => setDeleteDialog({ open: true, program })}
            >
              <Trash2 className="size-4 text-error" />
            </Button>
          </>
        )}
      />

      <Modal open={createFormOpen} onClose={() => setCreateFormOpen(false)} title="Create Program">
        <ProgramForm onSubmit={handleCreate} onCancel={() => setCreateFormOpen(false)} />
      </Modal>

      <Modal open={editFormOpen} onClose={() => setEditFormOpen(false)} title="Edit Program">
        {editingProgram && (
          <ProgramForm
            program={editingProgram}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditFormOpen(false);
              setEditingProgram(null);
            }}
            submitLabel="Update Program"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, program: null })}
        onConfirm={() => deleteDialog.program && handleDelete(deleteDialog.program)}
        title="Delete Program"
        message={`Are you sure you want to delete "${deleteDialog.program?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={publishDialog.open}
        onClose={() => setPublishDialog({ open: false, program: null, publish: true })}
        onConfirm={() => publishDialog.program && handlePublish(publishDialog.program, publishDialog.publish)}
        title={publishDialog.publish ? "Publish Program" : "Unpublish Program"}
        message={`Are you sure you want to ${publishDialog.publish ? "publish" : "unpublish"} "${publishDialog.program?.title}"?`}
        confirmLabel={publishDialog.publish ? "Publish" : "Unpublish"}
        loading={actionLoading}
      />
    </div>
  );
}
