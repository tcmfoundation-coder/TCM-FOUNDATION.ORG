import Link from "next/link";
import { BookOpen } from "lucide-react";
import { listBlogPosts } from "@/lib/api/blog";
import { ResourceCard } from "../content/resource-card";
import { EmptyState } from "../ui/empty-state";
import { buttonStyles } from "../ui/button";

export async function ResourcesPreview() {
  const posts = await listBlogPosts(3);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="mb-10 flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">Knowledge &amp; Insights</p>
        <h2 className="font-display text-3xl font-medium tracking-tight text-stone-900 md:text-4xl">Resources</h2>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Resources coming soon"
          description="Blog posts, articles, and spotlights will appear here as TCM Foundation publishes them."
        />
      ) : (
        <>
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
          <div className="mt-10">
            <Link href="/resources" className={buttonStyles({ variant: "secondary" })}>
              View All Resources
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
