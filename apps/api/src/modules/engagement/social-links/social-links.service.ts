import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SocialLinksService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.socialLink.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { platform: true, url: true },
    });
  }
}
