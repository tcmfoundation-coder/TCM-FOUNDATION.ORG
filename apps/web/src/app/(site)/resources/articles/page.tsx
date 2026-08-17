import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { listArticles } from "@/lib/api/articles";
import { ResourceCard } from "@/components/content/resource-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Articles",
  description: "Expert-written content on business, career, and faith-centered growth from TCM Foundation.",
};

export default async function ArticlesIndexPage() {
  const articles = await listArticles();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Articles" }]} />
      <h1 className="mt-6 mb-12 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        Articles
      </h1>

      {articles.length === 0 ? (
        <EmptyState icon={BookOpen} title="Articles coming soon" />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <ResourceCard
              key={article.id}
              href={`/resources/articles/${article.slug}`}
              title={article.title}
              excerpt={article.excerpt}
              date={article.publishedAt}
            />
          ))}
        </div>
      )}
    </main>
  );
}
