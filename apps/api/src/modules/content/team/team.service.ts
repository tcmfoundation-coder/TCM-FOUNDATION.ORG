import { Injectable } from '@nestjs/common';
import type { TeamMemberKind } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  list(kind?: TeamMemberKind) {
    return this.prisma.teamMember.findMany({
      where: { isPublished: true, ...(kind ? { kind } : {}) },
      select: { id: true, kind: true, name: true, title: true, bio: true },
      orderBy: { order: 'asc' },
    });
  }
}
