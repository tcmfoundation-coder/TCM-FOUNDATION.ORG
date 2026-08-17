import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ImpactStatsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.impactStat.findMany({
      where: { isPublished: true },
      select: { id: true, label: true, value: true },
      orderBy: { order: 'asc' },
    });
  }
}
