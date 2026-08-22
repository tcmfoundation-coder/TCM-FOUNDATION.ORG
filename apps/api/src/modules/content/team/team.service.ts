import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TeamMemberKind } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

const PUBLIC_SELECT = {
  id: true,
  kind: true,
  name: true,
  title: true,
  bio: true,
  photo: {
    select: {
      id: true,
      cloudinaryPublicId: true,
      secureUrl: true,
      altText: true,
    },
  },
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  photoId: true,
  order: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(kind?: TeamMemberKind) {
    return this.prisma.teamMember.findMany({
      where: { isPublished: true, ...(kind ? { kind } : {}) },
      select: PUBLIC_SELECT,
      orderBy: { order: 'asc' },
    });
  }

  async listAdmin(skip: number, take: number, kind?: TeamMemberKind) {
    const where = kind ? { kind } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.teamMember.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: { order: 'asc' },
        skip,
        take,
      }),
      this.prisma.teamMember.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!member) throw new NotFoundException('Team member not found');
    return member;
  }

  async create(dto: CreateTeamMemberDto, actorId: string, ipAddress?: string) {
    await this.assertMediaReferences(dto.photoId);
    try {
      const member = await this.prisma.teamMember.create({
        data: {
          kind: dto.kind,
          name: dto.name,
          title: dto.title,
          bio: dto.bio,
          photoId: dto.photoId,
          order: dto.order ?? 0,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'TeamMember',
        entityId: member.id,
        actorId,
        after: { name: member.name, kind: member.kind },
        ipAddress,
      });
      return member;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateTeamMemberDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    await this.assertMediaReferences(dto.photoId);
    try {
      const member = await this.prisma.teamMember.update({
        where: { id },
        data: dto,
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'TeamMember',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(member),
        ipAddress,
      });
      return member;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.teamMember.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'TeamMember',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private async assertMediaReferences(photoId?: string) {
    if (!photoId) return;
    const media = await this.prisma.media.findUnique({
      where: { id: photoId },
      select: { id: true, type: true },
    });
    if (!media || media.type !== 'IMAGE') {
      throw new BadRequestException('Photo must be an existing image');
    }
  }

  private auditSnapshot(member: {
    name: string;
    kind: TeamMemberKind;
    photoId: string | null;
  }) {
    return {
      name: member.name,
      kind: member.kind,
      photoId: member.photoId,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Team member not found');
      }
    }
    throw error;
  }
}
