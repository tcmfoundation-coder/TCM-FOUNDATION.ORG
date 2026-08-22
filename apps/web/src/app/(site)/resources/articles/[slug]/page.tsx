import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/api/articles";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { ResourceDetail } from "@/components/content/resource-detail";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/resources/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchOrNotFound(() => getArticleBySlug(slug));
  return buildMetadata({
    title: article.title,
    description: article.excerpt ?? `Read ${article.title} on TCM Foundation.`,
    path: `/resources/articles/${slug}`,
    image: article.coverImage ? { url: article.coverImage.secureUrl, alt: article.coverImage.altText } : undefined,
    type: "article",
  });
}

export default async function ArticlePage({ params }: PageProps<"/resources/articles/[slug]">) {
  const { slug } = await params;
  const article = await fetchOrNotFound(() => getArticleBySlug(slug));

  return (
    <ResourceDetail
      breadcrumbLabel="Articles"
      breadcrumbHref="/resources/articles"
      title={article.title}
      subtitle={article.excerpt}
      date={article.publishedAt}
      body={article.body}
    />
  );
}
