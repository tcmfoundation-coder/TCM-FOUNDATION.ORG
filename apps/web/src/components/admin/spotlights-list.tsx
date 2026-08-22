"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentList } from "./content-list";
import { SpotlightForm } from "./spotlight-form";
import {
  listSpotlightsAdmin,
  deleteSpotlight,
  publishSpotlight,
  createSpotlight,
  updateSpotlight,
  type SpotlightAdmin,
  type SpotlightWriteInput,
} from "@/lib/api/spotlights";

export function SpotlightsList() {
  const router = useRouter();
  const [spotlights, setSpotlights] = useState<SpotlightAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSpotlight, setEditingSpotlight] = useState<SpotlightAdmin | null>(null);

  useEffect(() => {
    loadSpotlights();
  }, []);

  async function loadSpotlights() {
    try {
      setLoading(true);
      setError(null);
      const response = await listSpotlightsAdmin({ take: 100 });
      setSpotlights(response.items);
    } catch (err) {
      setError("Failed to load spotlights");
      console.error("Spotlights load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: SpotlightWriteInput) {
    await createSpotlight(data);
    await loadSpotlights();
  }

  async function handleUpdate(data: SpotlightWriteInput) {
    if (!editingSpotlight) return;
    await updateSpotlight(editingSpotlight.id, data);
    setEditingSpotlight(null);
    await loadSpotlights();
  }

  async function handleDelete(spotlight: SpotlightAdmin) {
    await deleteSpotlight(spotlight.id);
  }

  async function handlePublish(spotlight: SpotlightAdmin, publish: boolean) {
    await publishSpotlight(spotlight.id, publish);
  }

  function handleView(spotlight: SpotlightAdmin) {
    router.push(`/resources/spotlights/${spotlight.slug}`);
  }

  function handleEdit(spotlight: SpotlightAdmin) {
    setEditingSpotlight(spotlight);
  }

  return (
    <ContentList
      title="Spotlights"
      description="Create and edit spotlight stories"
      items={spotlights}
      loading={loading}
      error={error}
      onLoad={loadSpotlights}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <SpotlightForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingSpotlight ? (
          <SpotlightForm
            spotlight={editingSpotlight}
            onSubmit={handleUpdate}
            onCancel={() => setEditingSpotlight(null)}
            submitLabel="Update Spotlight"
          />
        ) : null
      }
      emptyTitle="No spotlights found"
      emptyDescription="Create your first spotlight to get started."
    />
  );
}
