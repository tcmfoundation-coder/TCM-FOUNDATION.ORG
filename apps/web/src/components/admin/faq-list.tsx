"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { FaqForm } from "./faq-form";
import {
  listFaqAdmin,
  deleteFaq,
  createFaq,
  updateFaq,
  type FaqEntryAdmin,
  type FaqWriteInput,
} from "@/lib/api/faq";

export function FaqList() {
  const [faqs, setFaqs] = useState<FaqEntryAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<FaqEntryAdmin | null>(null);

  useEffect(() => {
    loadFaqs();
  }, []);

  async function loadFaqs() {
    try {
      setLoading(true);
      setError(null);
      const response = await listFaqAdmin({ take: 100 });
      setFaqs(response.items);
    } catch (err) {
      setError("Failed to load FAQs");
      console.error("FAQs load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: FaqWriteInput) {
    await createFaq(data);
    await loadFaqs();
  }

  async function handleUpdate(data: FaqWriteInput) {
    if (!editingFaq) return;
    await updateFaq(editingFaq.id, data);
    setEditingFaq(null);
    await loadFaqs();
  }

  async function handleDelete(faq: FaqEntryAdmin) {
    await deleteFaq(faq.id);
  }

  function handleEdit(faq: FaqEntryAdmin) {
    setEditingFaq(faq);
  }

  function handleView(faq: FaqEntryAdmin) {
    // FAQs don't have public pages yet
  }

  async function handlePublish(faq: FaqEntryAdmin, publish: boolean) {
    // FAQs don't have publish state
  }

  return (
    <ContentList
      title="FAQ"
      description="Manage frequently asked questions"
      items={faqs}
      loading={loading}
      error={error}
      onLoad={loadFaqs}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <FaqForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingFaq ? (
          <FaqForm
            faq={editingFaq}
            onSubmit={handleUpdate}
            onCancel={() => setEditingFaq(null)}
            submitLabel="Update FAQ"
          />
        ) : null
      }
      emptyTitle="No FAQs found"
      emptyDescription="Add your first FAQ to get started."
      showPublishToggle={false}
      columns={[
        {
          key: "question",
          label: "Question",
          sortable: true,
          render: (value, row) => (
            <div>
              <p className="font-medium text-stone-900">{row.question}</p>
              {row.category && <p className="text-xs text-stone-500">{row.category}</p>}
            </div>
          ),
        },
        {
          key: "answer",
          label: "Answer",
          render: (value) => (
            <p className="max-w-xs truncate text-sm text-stone-600">{String(value ?? "")}</p>
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
