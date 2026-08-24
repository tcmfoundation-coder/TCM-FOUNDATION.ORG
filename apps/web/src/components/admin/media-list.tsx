"use client";

import { useState, useEffect } from "react";
import { Upload, Edit, Trash2, Eye, Download } from "lucide-react";
import { Button } from "../ui/button";
import { DataTable, Column } from "./data-table";
import { SearchFilterBar } from "./search-filter-bar";
import { ConfirmDialog } from "./confirm-dialog";
import { ErrorState } from "../ui/error-state";
import { Modal } from "../ui/modal";
import { MediaUploadForm } from "./media-upload-form";
import { MediaEditForm } from "./media-edit-form";
import {
  listMedia,
  deleteMedia,
  updateMedia,
  type Media,
} from "@/lib/api/media";
import { buildCloudinaryAttachmentUrl, sanitizeDownloadFilename } from "@/lib/cloudinary-download";

export function MediaList() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [uploadFormOpen, setUploadFormOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: Media | null }>({
    open: false,
    item: null,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    try {
      setLoading(true);
      setError(null);
      const response = await listMedia({
        take: 100,
        type: (filterType as Media["type"]) || undefined,
      });
      setMedia(response.items);
    } catch (err) {
      setError("Failed to load media");
      console.error("Media load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    setUploadFormOpen(false);
    await loadMedia();
  }

  async function handleUpdate(data: { altText: string }) {
    if (!editingMedia) return;
    await updateMedia(editingMedia.id, data);
    setEditingMedia(null);
    setEditFormOpen(false);
    await loadMedia();
  }

  async function handleDelete(mediaItem: Media) {
    try {
      setActionLoading(true);
      await deleteMedia(mediaItem.id);
      setDeleteDialog({ open: false, item: null });
      await loadMedia();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setActionLoading(false);
    }
  }

  function handleEdit(mediaItem: Media) {
    setEditingMedia(mediaItem);
    setEditFormOpen(true);
  }

  function handleView(mediaItem: Media) {
    window.open(mediaItem.secureUrl, "_blank");
  }

  function handleDownload(mediaItem: Media) {
    // fl_attachment forces a real Content-Disposition: attachment from
    // Cloudinary — the plain `download` attribute this used to rely on is
    // ignored by browsers for cross-origin links (res.cloudinary.com is
    // cross-origin from the admin app). See cloudinary-download.ts.
    const link = document.createElement("a");
    link.href = buildCloudinaryAttachmentUrl(mediaItem.secureUrl, mediaItem.altText);
    link.download = sanitizeDownloadFilename(mediaItem.altText);
    link.click();
  }

  const filteredMedia = media.filter((item) => {
    const matchesSearch =
      item.altText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cloudinaryPublicId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const columns: Column<Media>[] = [
    {
      key: "altText",
      label: "Alt Text",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-medium text-stone-900">{row.altText}</p>
          <p className="text-xs text-stone-500">{row.type}</p>
        </div>
      ),
    },
    {
      key: "secureUrl",
      label: "Preview",
      render: (value, row) => {
        if (row.type === "IMAGE") {
          return (
            <img
              src={row.secureUrl}
              alt={row.altText}
              className="h-12 w-12 rounded object-cover"
            />
          );
        }
        return <span className="text-sm text-stone-600">{row.type}</span>;
      },
    },
    {
      key: "createdAt",
      label: "Uploaded",
      render: (value) => (
        <p className="text-sm text-stone-600">{new Date(String(value)).toLocaleDateString()}</p>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-stone-600">Upload and manage images and other media files</p>
        <Button onClick={() => setUploadFormOpen(true)}>
          <Upload className="size-4" aria-hidden="true" />
          Upload
        </Button>
      </div>

      <SearchFilterBar
        searchPlaceholder="Search by alt text or ID..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            key: "type",
            label: "Type",
            options: [
              { value: "IMAGE", label: "Images" },
              { value: "DOCUMENT", label: "Documents" },
              { value: "VIDEO", label: "Videos" },
            ],
            value: filterType,
            onChange: setFilterType,
          },
        ]}
        onClearFilters={() => {
          setSearchQuery("");
          setFilterType("");
        }}
      />

      <DataTable
        columns={columns}
        data={filteredMedia}
        loading={loading}
        empty={!loading && filteredMedia.length === 0}
        emptyTitle="No media found"
        emptyDescription="Upload your first media file to get started."
        emptyAction={
          <Button onClick={() => setUploadFormOpen(true)} size="sm">
            <Upload className="size-4" aria-hidden="true" />
            Upload
          </Button>
        }
        rowActions={(item) => (
          <>
            <Button variant="ghost" size="sm" title="View" onClick={() => handleView(item)}>
              <Eye className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Download" onClick={() => handleDownload(item)}>
              <Download className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Edit" onClick={() => handleEdit(item)}>
              <Edit className="size-4" />
            </Button>
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

      <Modal open={uploadFormOpen} onClose={() => setUploadFormOpen(false)} title="Upload Media">
        <MediaUploadForm onSubmit={handleUpload} onCancel={() => setUploadFormOpen(false)} />
      </Modal>

      <Modal open={editFormOpen} onClose={() => setEditFormOpen(false)} title="Edit Media">
        {editingMedia && (
          <MediaEditForm
            media={editingMedia}
            onSubmit={handleUpdate}
            onCancel={() => setEditFormOpen(false)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
        onConfirm={() => deleteDialog.item && handleDelete(deleteDialog.item)}
        title="Delete Media"
        message="Are you sure you want to delete this media file? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
