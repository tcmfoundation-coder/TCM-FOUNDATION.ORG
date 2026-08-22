import type { Metadata } from "next";
import { getBlogPostBySlug } from "@/lib/api/blog";
import { fetchOrNotFound } from "@/lib/api/fetch-or-not-found";
import { ResourceDetail } from "@/components/content/resource-detail";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/resources/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchOrNotFound(() => getBlogPostBySlug(slug));
  return buildMetadata({
    title: post.title,
    description: post.excerpt ?? `Read ${post.title} on the TCM Foundation blog.`,
    path: `/resources/blog/${slug}`,
    image: post.coverImage ? { url: post.coverImage.secureUrl, alt: post.coverImage.altText } : undefined,
    type: "article",
  });
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
