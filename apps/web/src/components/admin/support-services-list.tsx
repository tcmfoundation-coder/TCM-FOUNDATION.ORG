"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { SupportServiceForm } from "./support-service-form";
import { Badge } from "../ui/badge";
import {
  listSupportServices,
  createSupportService,
  updateSupportService,
  deleteSupportService,
  type SupportService,
} from "@/lib/api/support";

export function SupportServicesList() {
  const [services, setServices] = useState<SupportService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<SupportService | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setLoading(true);
      setError(null);
      const items = await listSupportServices();
      setServices(items);
    } catch (err) {
      setError("Failed to load support services");
      console.error("Support services load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: Partial<SupportService>) {
    await createSupportService(data);
    await loadServices();
  }

  async function handleUpdate(data: Partial<SupportService>) {
    if (!editingService) return;
    await updateSupportService(editingService.id, data);
    setEditingService(null);
    await loadServices();
  }

  async function handleDelete(service: SupportService) {
    await deleteSupportService(service.id);
  }

  function handleEdit(service: SupportService) {
    setEditingService(service);
  }

  function handleView() {
    // No standalone public detail page for a service — booking happens
    // directly on /support-lab, so "view" has nothing separate to open.
  }

  async function handlePublish() {
    // Services use isActive (toggled from the edit form), not a
    // publish/unpublish action — matches Partners' pattern for content
    // types without a publish workflow.
  }

  return (
    <ContentList
      title="Support Services"
      description="Manage the services visitors can book through TCM Support Lab"
      items={services}
      loading={loading}
      error={error}
      onLoad={loadServices}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <SupportServiceForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingService ? (
          <SupportServiceForm
            service={editingService}
            onSubmit={handleUpdate}
            onCancel={() => setEditingService(null)}
            submitLabel="Update Service"
          />
        ) : null
      }
      emptyTitle="No support services found"
      emptyDescription="Add your first support service to get started."
      showPublishToggle={false}
      columns={[
        {
          key: "name",
          label: "Name",
          sortable: true,
          render: (value, row) => (
            <div>
              <p className="font-medium text-stone-900">{row.name}</p>
              {row.description && <p className="text-xs text-stone-500">{row.description}</p>}
            </div>
          ),
        },
        {
          key: "isActive",
          label: "Status",
          render: (value) => (
            <Badge tone={value ? "brand" : "neutral"}>{value ? "Active" : "Inactive"}</Badge>
          ),
        },
        {
          key: "order",
          label: "Order",
          render: (value) => <p className="text-sm text-stone-600">{String(value)}</p>,
        },
      ]}
    />
  );
}
