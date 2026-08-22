"use client";

import { useState, useEffect } from "react";
import { ContentList } from "./content-list";
import { TestimonialForm } from "./testimonial-form";
import {
  listTestimonialsAdmin,
  deleteTestimonial,
  createTestimonial,
  updateTestimonial,
  type TestimonialAdmin,
  type TestimonialWriteInput,
} from "@/lib/api/testimonials";

export function TestimonialsList() {
  const [testimonials, setTestimonials] = useState<TestimonialAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialAdmin | null>(null);

  useEffect(() => {
    loadTestimonials();
  }, []);

  async function loadTestimonials() {
    try {
      setLoading(true);
      setError(null);
      const response = await listTestimonialsAdmin({ take: 100 });
      setTestimonials(response.items);
    } catch (err) {
      setError("Failed to load testimonials");
      console.error("Testimonials load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: TestimonialWriteInput) {
    await createTestimonial(data);
    await loadTestimonials();
  }

  async function handleUpdate(data: TestimonialWriteInput) {
    if (!editingTestimonial) return;
    await updateTestimonial(editingTestimonial.id, data);
    setEditingTestimonial(null);
    await loadTestimonials();
  }

  async function handleDelete(testimonial: TestimonialAdmin) {
    await deleteTestimonial(testimonial.id);
  }

  function handleEdit(testimonial: TestimonialAdmin) {
    setEditingTestimonial(testimonial);
  }

  function handleView(testimonial: TestimonialAdmin) {
    // Testimonials don't have public pages yet
  }

  async function handlePublish(testimonial: TestimonialAdmin, publish: boolean) {
    // Testimonials don't have publish state
  }

  return (
    <ContentList
      title="Testimonials"
      description="Manage testimonials"
      items={testimonials}
      loading={loading}
      error={error}
      onLoad={loadTestimonials}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <TestimonialForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingTestimonial ? (
          <TestimonialForm
            testimonial={editingTestimonial}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTestimonial(null)}
            submitLabel="Update Testimonial"
          />
        ) : null
      }
      emptyTitle="No testimonials found"
      emptyDescription="Add your first testimonial to get started."
      showPublishToggle={false}
      columns={[
        {
          key: "authorName",
          label: "Author",
          sortable: true,
          render: (value, row) => (
            <div>
              <p className="font-medium text-stone-900">{row.authorName}</p>
              <p className="text-xs text-stone-500">{row.authorRole || ""}</p>
            </div>
          ),
        },
        {
          key: "quote",
          label: "Quote",
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
