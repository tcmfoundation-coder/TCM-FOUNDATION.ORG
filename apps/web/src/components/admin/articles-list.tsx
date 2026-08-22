"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentList } from "./content-list";
import { ArticleForm } from "./article-form";
import {
  listArticlesAdmin,
  deleteArticle,
  publishArticle,
  createArticle,
  updateArticle,
  type ArticleAdmin,
  type ArticleWriteInput,
} from "@/lib/api/articles";

export function ArticlesList() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<ArticleAdmin | null>(null);

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      setLoading(true);
      setError(null);
      const response = await listArticlesAdmin({ take: 100 });
      setArticles(response.items);
    } catch (err) {
      setError("Failed to load articles");
      console.error("Articles load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data: ArticleWriteInput) {
    await createArticle(data);
    await loadArticles();
  }

  async function handleUpdate(data: ArticleWriteInput) {
    if (!editingArticle) return;
    await updateArticle(editingArticle.id, data);
    setEditingArticle(null);
    await loadArticles();
  }

  async function handleDelete(article: ArticleAdmin) {
    await deleteArticle(article.id);
  }

  async function handlePublish(article: ArticleAdmin, publish: boolean) {
    await publishArticle(article.id, publish);
  }

  function handleView(article: ArticleAdmin) {
    router.push(`/resources/articles/${article.slug}`);
  }

  function handleEdit(article: ArticleAdmin) {
    setEditingArticle(article);
  }

  return (
    <ContentList
      title="Articles"
      description="Create and edit articles"
      items={articles}
      loading={loading}
      error={error}
      onLoad={loadArticles}
      onEdit={handleEdit}
      onView={handleView}
      onDelete={handleDelete}
      onPublish={handlePublish}
      createForm={(close) => (
        <ArticleForm
          onSubmit={async (data) => {
            await handleCreate(data);
            close();
          }}
          onCancel={close}
        />
      )}
      editForm={
        editingArticle ? (
          <ArticleForm
            article={editingArticle}
            onSubmit={handleUpdate}
            onCancel={() => setEditingArticle(null)}
            submitLabel="Update Article"
          />
        ) : null
      }
      emptyTitle="No articles found"
      emptyDescription="Create your first article to get started."
    />
  );
}
