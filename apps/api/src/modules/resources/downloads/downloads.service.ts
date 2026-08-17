import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
} as const;

@Injectable()
export class DownloadsService {
  constructor(private readonly prisma: PrismaService) {}

  list(take?: number) {
    return this.prisma.download.findMany({
      where: { isPublished: true },
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getBySlug(slug: string) {
    const download = await this.prisma.download.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!download) throw new NotFoundException('Download not found');
    return download;
  }
}
