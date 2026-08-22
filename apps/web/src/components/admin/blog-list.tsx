"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentList } from "./content-list";
import { BlogForm } from "./blog-form";
import {
  listBlogPostsAdmin,
  deleteBlogPost,
  publishBlogPost,
  createBlogPost,
  updateBlogPost,
  type BlogPostAdmin,
  type BlogPostWriteInput,
} from "@/lib/api/blog";

export function BlogList() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPostAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPostAdmin | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      setError(null);
      const response = await listBlogPostsAdmin({ take: 100 });
      setPosts(response.items);
    } catch (err) {
      setError("Failed to load blog posts");
      console.error("Blog posts load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: BlogPostWriteInput) {
    await createBlogPost(data);
    await loadPosts();
  }

  async function handleUpdate(data: BlogPostWriteInput) {
    if (!editingPost) return;
    await updateBlogPost(editingPost.id, data);
    setEditingPost(null);
    await loadPosts();
  }

  async function handleDelete(post: BlogPostAdmin) {
    await deleteBlogPost(post.id);
  }

  async function handlePublish(post: BlogPostAdmin, publish: boolean) {
    await publishBlogPost(post.id, publish);
  }

  function handleView(post: BlogPostAdmin) {
    router.push(`/resources/blog/${post.slug}`);
  }

  function handleEdit(post: BlogPostAdmin) {
    setEditingPost(post);
  }

  return (
    <ContentList
      title="Blog Posts"
      description="Create and edit blog posts"
      items={posts}
      loading={loading}
      error={error}
      onLoad={loadPosts}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <BlogForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingPost ? (
          <BlogForm
            post={editingPost}
            onSubmit={handleUpdate}
            onCancel={() => setEditingPost(null)}
            submitLabel="Update Post"
          />
        ) : null
      }
      emptyTitle="No blog posts found"
      emptyDescription="Create your first blog post to get started."
    />
  );
}
