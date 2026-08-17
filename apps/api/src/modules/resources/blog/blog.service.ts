import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  body: true,
  publishedAt: true,
} as const;

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  list(take?: number) {
    return this.prisma.blogPost.findMany({
      where: { isPublished: true },
      select: PUBLIC_SELECT,
      orderBy: { publishedAt: 'desc' },
      take,
    });
  }

  async getBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }
}
