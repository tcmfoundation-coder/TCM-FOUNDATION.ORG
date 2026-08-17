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
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  list(take?: number) {
    return this.prisma.article.findMany({
      where: { isPublished: true },
      select: PUBLIC_SELECT,
      orderBy: { publishedAt: 'desc' },
      take,
    });
  }

  async getBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }
}
