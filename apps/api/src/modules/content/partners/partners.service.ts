import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.partner.findMany({
      where: { isPublished: true },
      select: { id: true, name: true, websiteUrl: true },
      orderBy: { order: 'asc' },
    });
  }
}
