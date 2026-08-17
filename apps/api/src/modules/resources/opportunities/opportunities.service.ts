import { Injectable, NotFoundException } from '@nestjs/common';
import type { OpportunityType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  type: true,
  deadline: true,
  externalApplyUrl: true,
} as const;

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(type?: OpportunityType) {
    return this.prisma.opportunity.findMany({
      where: { isPublished: true, ...(type ? { type } : {}) },
      select: PUBLIC_SELECT,
      orderBy: { deadline: 'asc' },
    });
  }

  async getBySlug(slug: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return opportunity;
  }
}
