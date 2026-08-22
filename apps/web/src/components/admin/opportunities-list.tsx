"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { OpportunityForm } from "./opportunity-form";
import {
  listOpportunitiesAdmin,
  deleteOpportunity,
  createOpportunity,
  updateOpportunity,
  publishOpportunity,
  type Opportunity,
} from "@/lib/api/opportunities";

export function OpportunitiesList() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  useEffect(() => {
    loadOpportunities();
  }, []);

  async function loadOpportunities() {
    try {
      setLoading(true);
      setError(null);
      const response = await listOpportunitiesAdmin({ take: 100 });
      setOpportunities(response.items);
    } catch (err) {
      setError("Failed to load opportunities");
      console.error("Opportunities load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: Partial<Opportunity>) {
    await createOpportunity(data);
    await loadOpportunities();
  }

  async function handleUpdate(data: Partial<Opportunity>) {
    if (!editingOpportunity) return;
    await updateOpportunity(editingOpportunity.id, data);
    setEditingOpportunity(null);
    await loadOpportunities();
  }

  async function handleDelete(opportunity: Opportunity) {
    await deleteOpportunity(opportunity.id);
    await loadOpportunities();
  }

  function handleEdit(opportunity: Opportunity) {
    setEditingOpportunity(opportunity);
  }

  function handleView(opportunity: Opportunity) {
    window.open(opportunity.externalApplyUrl, "_blank");
  }

  async function handlePublish(opportunity: Opportunity, publish: boolean) {
    await publishOpportunity(opportunity.id, publish);
    await loadOpportunities();
  }

  return (
    <div className="flex flex-col gap-6">
      <ContentList
      title="Opportunities"
      description="Manage career, business, and education opportunities"
      items={opportunities}
      loading={loading}
      error={error}
      onLoad={loadOpportunities}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <OpportunityForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingOpportunity ? (
          <OpportunityForm
            opportunity={editingOpportunity}
            onSubmit={handleUpdate}
            onCancel={() => setEditingOpportunity(null)}
            submitLabel="Update Opportunity"
          />
        ) : null
      }
      emptyTitle="No opportunities found"
      emptyDescription="Add your first opportunity to get started."
      columns={[
        {
          key: "title",
          label: "Title",
          sortable: true,
          render: (value, row) => (
            <div>
              <p className="font-medium text-stone-900">{row.title}</p>
              <p className="text-xs text-stone-500">{row.type}</p>
            </div>
          ),
        },
        {
          key: "deadline",
          label: "Deadline",
          render: (value) => (
            <p className="text-sm text-stone-600">{value ? new Date(String(value)).toLocaleDateString() : "No deadline"}</p>
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
    </div>
  );
}
