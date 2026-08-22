import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SupportRequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { SubmitSupportRequestDto } from './dto/submit-support-request.dto';
import { CreateSupportServiceDto } from './dto/create-support-service.dto';
import { UpdateSupportServiceDto } from './dto/update-support-service.dto';

const SERVICE_SELECT = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  order: true,
} as const;

const REQUEST_SELECT = {
  id: true,
  serviceId: true,
  service: { select: SERVICE_SELECT },
  requesterName: true,
  requesterEmail: true,
  requesterPhone: true,
  message: true,
  status: true,
  handledById: true,
  handledBy: { select: { id: true, email: true } },
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SupportLabService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  // --- Support services (referenced by requests; own admin CRUD) -------

  listServices() {
    return this.prisma.supportService.findMany({
      select: SERVICE_SELECT,
      orderBy: { order: 'asc' },
    });
  }

  async createService(
    dto: CreateSupportServiceDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const service = await this.prisma.supportService.create({
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        order: dto.order ?? 0,
      },
      select: SERVICE_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_CREATED',
      entityType: 'SupportService',
      entityId: service.id,
      actorId,
      after: { name: service.name, isActive: service.isActive },
      ipAddress,
    });
    return service;
  }

  async updateService(
    id: string,
    dto: UpdateSupportServiceDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getServiceOrThrow(id);
    const service = await this.prisma.supportService.update({
      where: { id },
      data: dto,
      select: SERVICE_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'SupportService',
      entityId: id,
      actorId,
      before: { name: before.name, isActive: before.isActive },
      after: { name: service.name, isActive: service.isActive },
      ipAddress,
    });
    return service;
  }

  async removeService(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getServiceOrThrow(id);
    try {
      await this.prisma.supportService.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a support service that has existing requests',
        );
      }
      throw error;
    }
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'SupportService',
      entityId: id,
      actorId,
      before: { name: before.name },
      ipAddress,
    });
  }

  private async getServiceOrThrow(id: string) {
    const service = await this.prisma.supportService.findUnique({
      where: { id },
      select: SERVICE_SELECT,
    });
    if (!service) throw new NotFoundException('Support service not found');
    return service;
  }

  // --- Support requests --------------------------------------------------

  async submit(dto: SubmitSupportRequestDto) {
    const service = await this.prisma.supportService.findUnique({
      where: { id: dto.serviceId },
      select: { id: true, isActive: true },
    });
    // Never trust client-claimed service state — the same rule already
    // applied to Call for Applications' campaign status check.
    if (!service || !service.isActive) {
      throw new NotFoundException('Support service not found');
    }

    const request = await this.prisma.supportRequest.create({
      data: {
        serviceId: dto.serviceId,
        requesterName: dto.requesterName,
        requesterEmail: dto.requesterEmail,
        requesterPhone: dto.requesterPhone,
        message: dto.message,
      },
      select: { id: true, createdAt: true },
    });

    // Public submissions are not audit-logged, matching Contact/Newsletter/
    // Application Submissions elsewhere in this codebase — AuditLog is
    // reserved for privileged actions, not anonymous visitor activity.
    return request;
  }

  async list(skip: number, take: number, status?: SupportRequestStatus) {
    const where: Prisma.SupportRequestWhereInput = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportRequest.findMany({
        where,
        select: REQUEST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.supportRequest.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const request = await this.prisma.supportRequest.findUnique({
      where: { id },
      select: REQUEST_SELECT,
    });
    if (!request) throw new NotFoundException('Support request not found');
    return request;
  }

  async updateStatus(
    id: string,
    status: SupportRequestStatus,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.prisma.supportRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!before) throw new NotFoundException('Support request not found');

    const request = await this.prisma.supportRequest.update({
      where: { id },
      data: { status },
      select: REQUEST_SELECT,
    });

    await this.audit.record({
      action: 'SUBMISSION_STATUS_CHANGED',
      entityType: 'SupportRequest',
      entityId: id,
      actorId,
      before: { status: before.status },
      after: { status: request.status },
      ipAddress,
    });

    return request;
  }

  async assignHandler(
    id: string,
    handledById: string | null,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.prisma.supportRequest.findUnique({
      where: { id },
      select: { id: true, handledById: true },
    });
    if (!before) throw new NotFoundException('Support request not found');

    if (handledById) {
      const handler = await this.prisma.user.findUnique({
        where: { id: handledById },
        select: { id: true },
      });
      if (!handler) throw new NotFoundException('Handler not found');
    }

    const request = await this.prisma.supportRequest.update({
      where: { id },
      data: { handledById },
      select: REQUEST_SELECT,
    });

    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'SupportRequest',
      entityId: id,
      actorId,
      before: { handledById: before.handledById },
      after: { handledById: request.handledById },
      ipAddress,
    });

    return request;
  }
}
