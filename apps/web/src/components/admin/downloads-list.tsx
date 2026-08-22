"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { DownloadForm } from "./download-form";
import {
  listDownloadsAdmin,
  deleteDownload,
  publishDownload,
  createDownload,
  updateDownload,
  type DownloadAdmin,
  type DownloadWriteInput,
} from "@/lib/api/downloads";

export function DownloadsList() {
  const [downloads, setDownloads] = useState<DownloadAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDownload, setEditingDownload] = useState<DownloadAdmin | null>(null);

  useEffect(() => {
    loadDownloads();
  }, []);

  async function loadDownloads() {
    try {
      setLoading(true);
      setError(null);
      const response = await listDownloadsAdmin({ take: 100 });
      setDownloads(response.items);
    } catch (err) {
      setError("Failed to load downloadable resources");
      console.error("Downloads load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: DownloadWriteInput) {
    await createDownload(data);
    await loadDownloads();
  }

  async function handleUpdate(data: DownloadWriteInput) {
    if (!editingDownload) return;
    await updateDownload(editingDownload.id, data);
    setEditingDownload(null);
    await loadDownloads();
  }

  async function handleDelete(download: DownloadAdmin) {
    await deleteDownload(download.id);
  }

  async function handlePublish(download: DownloadAdmin, publish: boolean) {
    await publishDownload(download.id, publish);
  }

  function handleView(download: DownloadAdmin) {
    if (download.file) {
      window.open(download.file.secureUrl, "_blank");
    }
  }

  function handleEdit(download: DownloadAdmin) {
    setEditingDownload(download);
  }

  return (
    <ContentList
      title="Downloadable Resources"
      description="Manage files available for download on the public site"
      items={downloads}
      loading={loading}
      error={error}
      onLoad={loadDownloads}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <DownloadForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingDownload ? (
          <DownloadForm
            download={editingDownload}
            onSubmit={handleUpdate}
            onCancel={() => setEditingDownload(null)}
            submitLabel="Update Resource"
          />
        ) : null
      }
      emptyTitle="No downloadable resources found"
      emptyDescription="Create your first downloadable resource to get started."
      columns={[
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
          key: "isPublished",
          label: "Status",
          render: (value) => (
            <span className={value ? "text-sm text-brand-700" : "text-sm text-stone-500"}>
              {value ? "Published" : "Draft"}
            </span>
          ),
        },
        {
          key: "createdAt",
          label: "Created",
          render: (value) => (
            <p className="text-sm text-stone-600">{new Date(String(value)).toLocaleDateString()}</p>
          ),
        },
      ]}
    />
  );
}
