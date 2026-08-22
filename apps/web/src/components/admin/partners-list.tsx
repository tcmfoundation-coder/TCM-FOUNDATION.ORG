"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { PartnerForm } from "./partner-form";
import {
  listPartnersAdmin,
  deletePartner,
  createPartner,
  updatePartner,
  type PartnerAdmin,
  type PartnerWriteInput,
} from "@/lib/api/partners";

export function PartnersList() {
  const [partners, setPartners] = useState<PartnerAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState<PartnerAdmin | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  async function loadPartners() {
    try {
      setLoading(true);
      setError(null);
      const response = await listPartnersAdmin({ take: 100 });
      setPartners(response.items);
    } catch (err) {
      setError("Failed to load partners");
      console.error("Partners load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: PartnerWriteInput) {
    await createPartner(data);
    await loadPartners();
  }

  async function handleUpdate(data: PartnerWriteInput) {
    if (!editingPartner) return;
    await updatePartner(editingPartner.id, data);
    setEditingPartner(null);
    await loadPartners();
  }

  async function handleDelete(partner: PartnerAdmin) {
    await deletePartner(partner.id);
  }

  function handleEdit(partner: PartnerAdmin) {
    setEditingPartner(partner);
  }

  function handleView(partner: PartnerAdmin) {
    if (partner.websiteUrl) {
      window.open(partner.websiteUrl, "_blank");
    }
  }

  async function handlePublish(partner: PartnerAdmin, publish: boolean) {
    // Partners don't have publish state
  }

  return (
    <ContentList
      title="Partners"
      description="Manage partner organizations"
      items={partners}
      loading={loading}
      error={error}
      onLoad={loadPartners}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <PartnerForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingPartner ? (
          <PartnerForm
            partner={editingPartner}
            onSubmit={handleUpdate}
            onCancel={() => setEditingPartner(null)}
            submitLabel="Update Partner"
          />
        ) : null
      }
      emptyTitle="No partners found"
      emptyDescription="Add your first partner to get started."
      showPublishToggle={false}
      columns={[
        {
          key: "name",
          label: "Name",
          sortable: true,
          render: (value, row) => (
            <div>
              <p className="font-medium text-stone-900">{row.name}</p>
              {row.websiteUrl && (
                <a
                  href={row.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-700 hover:text-brand-800"
                >
                  {row.websiteUrl}
                </a>
              )}
            </div>
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
