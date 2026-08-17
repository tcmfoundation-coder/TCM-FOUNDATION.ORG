import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  subjectName: true,
  title: true,
  body: true,
  publishedAt: true,
} as const;

@Injectable()
export class SpotlightsService {
  constructor(private readonly prisma: PrismaService) {}

  list(take?: number) {
    return this.prisma.spotlight.findMany({
      where: { isPublished: true },
      select: PUBLIC_SELECT,
      orderBy: { publishedAt: 'desc' },
      take,
    });
  }

  async getBySlug(slug: string) {
    const spotlight = await this.prisma.spotlight.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!spotlight) throw new NotFoundException('Spotlight not found');
    return spotlight;
  }
}
