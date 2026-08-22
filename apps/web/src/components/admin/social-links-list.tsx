"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { SocialLinkForm } from "./social-link-form";
import { Badge } from "../ui/badge";
import {
  listSocialLinksAdmin,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  type SocialLinkAdmin,
  type SocialLinkWriteInput,
} from "@/lib/api/social-links";

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  twitter: "X (legacy)",
  tiktok: "TikTok",
};

export function SocialLinksList() {
  const [links, setLinks] = useState<SocialLinkAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<SocialLinkAdmin | null>(null);

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      setLoading(true);
      setError(null);
      const items = await listSocialLinksAdmin();
      setLinks(items);
    } catch (err) {
      setError("Failed to load social links");
      console.error("Social links load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: SocialLinkWriteInput) {
    await createSocialLink(data);
    await loadLinks();
  }

  async function handleUpdate(data: SocialLinkWriteInput) {
    if (!editingLink) return;
    await updateSocialLink(editingLink.id, data);
    setEditingLink(null);
    await loadLinks();
  }

  async function handleDelete(link: SocialLinkAdmin) {
    await deleteSocialLink(link.id);
  }

  function handleEdit(link: SocialLinkAdmin) {
    setEditingLink(link);
  }

  function handleView(link: SocialLinkAdmin) {
    window.open(link.url, "_blank");
  }

  async function handlePublish() {
    // Social links use isActive (toggled from the edit form), not a
    // publish/unpublish action — matches Partners' pattern.
  }

  return (
    <ContentList
      title="Social Links"
      description="Manage the official TCM Foundation social media links shown in the site footer"
      items={links}
      loading={loading}
      error={error}
      onLoad={loadLinks}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <SocialLinkForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingLink ? (
          <SocialLinkForm
            link={editingLink}
            onSubmit={handleUpdate}
            onCancel={() => setEditingLink(null)}
            submitLabel="Update Social Link"
          />
        ) : null
      }
      emptyTitle="No social links found"
      emptyDescription="Add your first official social link to get started."
      showPublishToggle={false}
      columns={[
        {
          key: "platform",
          label: "Platform",
          sortable: true,
          render: (value, row) => (
            <div>
              <p className="font-medium text-stone-900">{PLATFORM_LABELS[row.platform] ?? row.platform}</p>
              <p className="text-xs text-stone-500">{row.url}</p>
            </div>
          ),
        },
        {
          key: "isActive",
          label: "Status",
          render: (value) => <Badge tone={value ? "brand" : "neutral"}>{value ? "Active" : "Inactive"}</Badge>,
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
