import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.fAQ.findMany({
      select: { id: true, question: true, answer: true, category: true },
      orderBy: { order: 'asc' },
    });
  }
}
