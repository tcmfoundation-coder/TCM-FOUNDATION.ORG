"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { ImpactStatForm } from "./impact-stat-form";
import {
  listImpactStatsAdmin,
  deleteImpactStat,
  createImpactStat,
  updateImpactStat,
  type ImpactStatAdmin,
  type ImpactStatWriteInput,
} from "@/lib/api/impact-stats";

export function ImpactStatsList() {
  const [stats, setStats] = useState<ImpactStatAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingStat, setEditingStat] = useState<ImpactStatAdmin | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const response = await listImpactStatsAdmin({ take: 100 });
      setStats(response.items);
    } catch (err) {
      setError("Failed to load impact stats");
      console.error("Impact stats load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: ImpactStatWriteInput) {
    await createImpactStat(data);
    await loadStats();
  }

  async function handleUpdate(data: ImpactStatWriteInput) {
    if (!editingStat) return;
    await updateImpactStat(editingStat.id, data);
    setEditingStat(null);
    await loadStats();
  }

  async function handleDelete(stat: ImpactStatAdmin) {
    await deleteImpactStat(stat.id);
  }

  function handleEdit(stat: ImpactStatAdmin) {
    setEditingStat(stat);
  }

  function handleView(stat: ImpactStatAdmin) {
    // Impact stats don't have public pages
  }

  async function handlePublish(stat: ImpactStatAdmin, publish: boolean) {
    // Impact stats don't have publish state
  }

  return (
    <ContentList
      title="Impact Stats"
      description="Manage impact statistics"
      items={stats}
      loading={loading}
      error={error}
      onLoad={loadStats}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <ImpactStatForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingStat ? (
          <ImpactStatForm
            stat={editingStat}
            onSubmit={handleUpdate}
            onCancel={() => setEditingStat(null)}
            submitLabel="Update Stat"
          />
        ) : null
      }
      emptyTitle="No impact stats found"
      emptyDescription="Add your first impact stat to get started."
      showPublishToggle={false}
      columns={[
        {
          key: "label",
          label: "Label",
          sortable: true,
          render: (value) => <p className="font-medium text-stone-900">{String(value)}</p>,
        },
        {
          key: "value",
          label: "Value",
          sortable: true,
          render: (value) => <p className="text-sm text-stone-600">{String(value)}</p>,
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
