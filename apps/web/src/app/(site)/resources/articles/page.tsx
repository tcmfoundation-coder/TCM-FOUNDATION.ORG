import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { listArticles } from "@/lib/api/articles";
import { listCategories } from "@/lib/api/categories";
import { ResourceCard } from "@/components/content/resource-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Articles",
  description: "Expert-written content on business, career, and faith-centered growth from TCM Foundation.",
  path: "/resources/articles",
});

export default async function ArticlesIndexPage({
  searchParams,
}: PageProps<"/resources/articles">) {
  const { category } = await searchParams;
  const selectedCategory = typeof category === "string" ? category : undefined;

  const [response, categories] = await Promise.all([
    listArticles({ category: selectedCategory }),
    listCategories("ARTICLE"),
  ]);
  const articles = Array.isArray(response) ? response : response?.items || [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Articles" }]} />
      <h1 className="mt-6 mb-6 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        Articles
      </h1>

      {categories.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2">
          <Link
            href="/resources/articles"
            className={`rounded-sm px-3.5 py-1.5 text-sm font-medium ${
              !selectedCategory
                ? "bg-brand-600 text-white"
                : "border border-stone-200 text-stone-600 hover:border-brand-300"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/resources/articles?category=${cat.slug}`}
              className={`rounded-sm px-3.5 py-1.5 text-sm font-medium ${
                selectedCategory === cat.slug
                  ? "bg-brand-600 text-white"
                  : "border border-stone-200 text-stone-600 hover:border-brand-300"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {articles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={selectedCategory ? "No articles in this category yet" : "Articles coming soon"}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <ResourceCard
              key={article.id}
              href={`/resources/articles/${article.slug}`}
              title={article.title}
              excerpt={article.excerpt}
              date={article.publishedAt}
              image={article.coverImage}
              category={article.categories[0]?.name}
            />
          ))}
        </div>
      )}
    </main>
  );
}
