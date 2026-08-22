import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateSocialLinkDto } from './dto/create-social-link.dto';
import { UpdateSocialLinkDto } from './dto/update-social-link.dto';

const ADMIN_SELECT = {
  id: true,
  platform: true,
  url: true,
  order: true,
  isActive: true,
} as const;

@Injectable()
export class SocialLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  listActive() {
    return this.prisma.socialLink.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { platform: true, url: true },
    });
  }

  listAdmin() {
    return this.prisma.socialLink.findMany({
      select: ADMIN_SELECT,
      orderBy: { order: 'asc' },
    });
  }

  async getById(id: string) {
    const link = await this.prisma.socialLink.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!link) throw new NotFoundException('Social link not found');
    return link;
  }

  async create(dto: CreateSocialLinkDto, actorId: string, ipAddress?: string) {
    const link = await this.prisma.socialLink.create({
      data: {
        platform: dto.platform,
        url: dto.url,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
      select: ADMIN_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_CREATED',
      entityType: 'SocialLink',
      entityId: link.id,
      actorId,
      after: {
        platform: link.platform,
        url: link.url,
        isActive: link.isActive,
      },
      ipAddress,
    });
    return link;
  }

  async update(
    id: string,
    dto: UpdateSocialLinkDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    const link = await this.prisma.socialLink.update({
      where: { id },
      data: dto,
      select: ADMIN_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'SocialLink',
      entityId: id,
      actorId,
      before: {
        platform: before.platform,
        url: before.url,
        isActive: before.isActive,
      },
      after: {
        platform: link.platform,
        url: link.url,
        isActive: link.isActive,
      },
      ipAddress,
    });
    return link;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.socialLink.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'SocialLink',
      entityId: id,
      actorId,
      before: { platform: before.platform, url: before.url },
      ipAddress,
    });
  }
}
