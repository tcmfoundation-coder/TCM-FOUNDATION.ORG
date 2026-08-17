import type { Metadata } from "next";
import { getBlogPostBySlug } from "@/lib/api/blog";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { ResourceDetail } from "@/components/content/resource-detail";

export async function generateMetadata({ params }: PageProps<"/resources/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchOrNotFound(() => getBlogPostBySlug(slug));
  return { title: post.title, description: post.excerpt ?? undefined };
}

export default async function BlogPostPage({ params }: PageProps<"/resources/blog/[slug]">) {
  const { slug } = await params;
  const post = await fetchOrNotFound(() => getBlogPostBySlug(slug));

  return (
    <ResourceDetail
      breadcrumbLabel="Blog"
      breadcrumbHref="/resources/blog"
      title={post.title}
      subtitle={post.excerpt}
      date={post.publishedAt}
      body={post.body}
    />
  );
}
