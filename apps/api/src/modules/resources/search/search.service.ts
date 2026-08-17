import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type SearchResultType =
  'program' | 'blog' | 'article' | 'spotlight' | 'opportunity';

export interface SearchResult {
  type: SearchResultType;
  slug: string;
  title: string;
  excerpt: string | null;
}

// Simple ILIKE-based search across published content. A Postgres
// full-text index is a reasonable future optimization once content volume
// justifies it — not needed for V1 (plan section: Backend Public Read API).
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const contains = { contains: query, mode: 'insensitive' as const };

    const [programs, blogPosts, articles, spotlights, opportunities] =
      await Promise.all([
        this.prisma.program.findMany({
          where: { isPublished: true, title: contains },
          select: { slug: true, title: true, description: true },
          take: 10,
        }),
        this.prisma.blogPost.findMany({
          where: { isPublished: true, title: contains },
          select: { slug: true, title: true, excerpt: true },
          take: 10,
        }),
        this.prisma.article.findMany({
          where: { isPublished: true, title: contains },
          select: { slug: true, title: true, excerpt: true },
          take: 10,
        }),
        this.prisma.spotlight.findMany({
          where: { isPublished: true, title: contains },
          select: { slug: true, title: true, subjectName: true },
          take: 10,
        }),
        this.prisma.opportunity.findMany({
          where: { isPublished: true, title: contains },
          select: { slug: true, title: true, description: true },
          take: 10,
        }),
      ]);

    return [
      ...programs.map((p) => ({
        type: 'program' as const,
        slug: p.slug,
        title: p.title,
        excerpt: p.description,
      })),
      ...blogPosts.map((p) => ({
        type: 'blog' as const,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
      })),
      ...articles.map((p) => ({
        type: 'article' as const,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
      })),
      ...spotlights.map((p) => ({
        type: 'spotlight' as const,
        slug: p.slug,
        title: p.title,
        excerpt: p.subjectName,
      })),
      ...opportunities.map((p) => ({
        type: 'opportunity' as const,
        slug: p.slug,
        title: p.title,
        excerpt: p.description,
      })),
    ];
  }
}
