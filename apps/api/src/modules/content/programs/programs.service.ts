import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  objectives: true,
  audience: true,
  impact: true,
  ctaLabel: true,
  ctaUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(take?: number) {
    return this.prisma.program.findMany({
      where: { isPublished: true },
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getBySlug(slug: string) {
    const program = await this.prisma.program.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }
}
