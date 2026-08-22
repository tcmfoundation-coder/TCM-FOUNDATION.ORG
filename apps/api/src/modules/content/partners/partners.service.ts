import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  websiteUrl: true,
  logo: {
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
  logoId: true,
  order: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list() {
    return this.prisma.partner.findMany({
      where: { isPublished: true },
      select: PUBLIC_SELECT,
      orderBy: { order: 'asc' },
    });
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.partner.findMany({
        select: ADMIN_SELECT,
        orderBy: { order: 'asc' },
        skip,
        take,
      }),
      this.prisma.partner.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  async create(dto: CreatePartnerDto, actorId: string, ipAddress?: string) {
    await this.assertMediaReferences(dto.logoId);
    try {
      const partner = await this.prisma.partner.create({
        data: {
          name: dto.name,
          websiteUrl: dto.websiteUrl,
          logoId: dto.logoId,
          order: dto.order ?? 0,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'Partner',
        entityId: partner.id,
        actorId,
        after: { name: partner.name },
        ipAddress,
      });
      return partner;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdatePartnerDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    await this.assertMediaReferences(dto.logoId);
    try {
      const partner = await this.prisma.partner.update({
        where: { id },
        data: dto,
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'Partner',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(partner),
        ipAddress,
      });
      return partner;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.partner.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'Partner',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private async assertMediaReferences(logoId?: string) {
    if (!logoId) return;
    const media = await this.prisma.media.findUnique({
      where: { id: logoId },
      select: { id: true, type: true },
    });
    if (!media || media.type !== 'IMAGE') {
      throw new BadRequestException('Logo must be an existing image');
    }
  }

  private auditSnapshot(partner: { name: string; logoId: string | null }) {
    return {
      name: partner.name,
      logoId: partner.logoId,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2025') {
        throw new NotFoundException('Partner not found');
      }
    }
    throw error;
  }
}
