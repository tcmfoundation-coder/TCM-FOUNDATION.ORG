"use client";

import { useState } from "react";
import { Plus, Edit, Eye, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { DataTable, Column } from "./data-table";
import { SearchFilterBar } from "./search-filter-bar";
import { ConfirmDialog } from "./confirm-dialog";
import { ErrorState } from "../ui/error-state";
import { ClientPagination } from "./client-pagination";
import { showToast } from "../ui/toast";
import { ApiError } from "@/lib/api-client";

const PAGE_SIZE = 20;

interface ContentListProps<T> {
  title: string;
  description: string;
  items: T[];
  loading: boolean;
  error: string | null;
  onLoad: () => Promise<void>;
  onEdit: (item: T) => void;
  onView: (item: T) => void;
  onDelete: (item: T) => Promise<void>;
  onPublish: (item: T, publish: boolean) => Promise<void>;
  /** Receives a `close` callback — call it after a successful submit or cancel. */
  createForm?: (close: () => void) => React.ReactNode;
  editForm?: React.ReactNode;
  columns?: Column<T>[];
  emptyTitle?: string;
  emptyDescription?: string;
  showPublishToggle?: boolean;
}

export function ContentList<T>({
  title,
  description,
  items,
  loading,
  error,
  onLoad,
  onEdit,
  onView,
  onDelete,
  onPublish,
  createForm,
  editForm,
  columns,
  emptyTitle = "No items found",
  emptyDescription = "Create your first item to get started.",
  showPublishToggle = true,
}: ContentListProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: T | null }>({
    open: false,
    item: null,
  });
  const [publishDialog, setPublishDialog] = useState<{ open: boolean; item: T | null; publish: boolean }>({
    open: false,
    item: null,
    publish: true,
  });
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchesSearch = columns?.some((col) => {
      const value = col.key ? (item as Record<string, unknown>)[col.key] : null;
      return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
    }) || searchQuery === "";
    const isPublished = (item as { isPublished?: boolean }).isPublished;
    const matchesStatus =
      !showPublishToggle ||
      filterStatus === "" ||
      (filterStatus === "published" && isPublished) ||
      (filterStatus === "draft" && !isPublished);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  // Reset to page 1 when the search/filter changes, computed during render
  // (React's documented pattern for this) rather than in a useEffect.
  const [prevFilterKey, setPrevFilterKey] = useState(`${searchQuery}:${filterStatus}`);
  const filterKey = `${searchQuery}:${filterStatus}`;
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const currentPage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const tableColumns = columns || [];

  async function handleDelete(item: T) {
    try {
      setActionLoading(true);
      await onDelete(item);
      setDeleteDialog({ open: false, item: null });
      await onLoad();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't delete this item. Please try again.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish(item: T, publish: boolean) {
    try {
      setActionLoading(true);
      await onPublish(item, publish);
      setPublishDialog({ open: false, item: null, publish: true });
      await onLoad();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : `Couldn't ${publish ? "publish" : "unpublish"} this item. Please try again.`,
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleEdit(item: T) {
    onEdit(item);
    setEditFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-stone-600">{description}</p>
        <Button onClick={() => setCreateFormOpen(true)} aria-label={`Create ${title}`}>
          <Plus className="size-4" aria-hidden="true" />
          Create
        </Button>
      </div>

      {error ? (
        <ErrorState title={`Couldn't load ${title.toLowerCase()}`} description={error} onRetry={onLoad} />
      ) : (
        <>
          <SearchFilterBar
            searchPlaceholder="Search..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={
              showPublishToggle
                ? [
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
                  ]
                : []
            }
            onClearFilters={() => {
              setSearchQuery("");
              setFilterStatus("");
            }}
          />

          <DataTable
            columns={tableColumns}
            data={pagedItems}
            loading={loading}
            empty={!loading && filteredItems.length === 0}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            emptyAction={
              <Button onClick={() => setCreateFormOpen(true)} size="sm">
                <Plus className="size-4" aria-hidden="true" />
                Create
              </Button>
            }
            rowActions={(item) => (
              <>
                <Button variant="ghost" size="sm" title="View" onClick={() => onView(item)}>
                  <Eye className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEdit(item)}>
                  <Edit className="size-4" />
                </Button>
                {showPublishToggle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title={(item as { isPublished?: boolean }).isPublished ? "Unpublish" : "Publish"}
                    onClick={() =>
                      setPublishDialog({
                        open: true,
                        item,
                        publish: !(item as { isPublished?: boolean }).isPublished,
                      })
                    }
                  >
                    {(item as { isPublished?: boolean }).isPublished ? (
                      <PowerOff className="size-4" />
                    ) : (
                      <Power className="size-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  title="Delete"
                  onClick={() => setDeleteDialog({ open: true, item })}
                >
                  <Trash2 className="size-4 text-error" />
                </Button>
              </>
            )}
          />

          {!loading && (
            <ClientPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      {createForm && (
        <Modal open={createFormOpen} onClose={() => setCreateFormOpen(false)} title={`Create ${title}`}>
          {createForm(() => setCreateFormOpen(false))}
        </Modal>
      )}

      {editForm && (
        <Modal open={editFormOpen} onClose={() => setEditFormOpen(false)} title={`Edit ${title}`}>
          {editForm}
        </Modal>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
        onConfirm={() => deleteDialog.item && handleDelete(deleteDialog.item)}
        title="Delete Item"
        message={`Are you sure you want to delete this item? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={publishDialog.open}
        onClose={() => setPublishDialog({ open: false, item: null, publish: true })}
        onConfirm={() => publishDialog.item && handlePublish(publishDialog.item, publishDialog.publish)}
        title={publishDialog.publish ? "Publish Item" : "Unpublish Item"}
        message={`Are you sure you want to ${publishDialog.publish ? "publish" : "unpublish"} this item?`}
        confirmLabel={publishDialog.publish ? "Publish" : "Unpublish"}
        loading={actionLoading}
      />
    </div>
  );
}
