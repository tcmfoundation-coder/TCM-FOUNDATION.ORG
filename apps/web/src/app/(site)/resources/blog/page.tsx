import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { listBlogPosts } from "@/lib/api/blog";
import { ResourceCard } from "@/components/content/resource-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Blog",
  description: "Regular updates, thought pieces, tutorials, and reviews from TCM Foundation.",
};

export default async function BlogIndexPage() {
  const posts = await listBlogPosts();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <Breadcrumbs items={[{ label: "Resources", href: "/resources" }, { label: "Blog" }]} />
      <h1 className="mt-6 mb-12 font-display text-4xl font-medium tracking-tight text-stone-900 md:text-5xl">
        Blog
      </h1>

      {posts.length === 0 ? (
        <EmptyState icon={Newspaper} title="Blog posts coming soon" />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <ResourceCard
              key={post.id}
              href={`/resources/blog/${post.slug}`}
              title={post.title}
              excerpt={post.excerpt}
              date={post.publishedAt}
            />
          ))}
        </div>
      )}
    </main>
  );
}
