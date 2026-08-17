import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  list(take?: number) {
    return this.prisma.testimonial.findMany({
      where: { isApproved: true },
      select: { id: true, authorName: true, authorRole: true, quote: true },
      orderBy: { order: 'asc' },
      take,
    });
  }
}
