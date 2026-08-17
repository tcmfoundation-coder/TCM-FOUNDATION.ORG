import { Injectable } from '@nestjs/common';
import type { CategoryAppliesTo } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(appliesTo?: CategoryAppliesTo) {
    return this.prisma.category.findMany({
      where: appliesTo ? { appliesTo } : {},
      select: { id: true, name: true, slug: true, appliesTo: true },
      orderBy: { name: 'asc' },
    });
  }
}
