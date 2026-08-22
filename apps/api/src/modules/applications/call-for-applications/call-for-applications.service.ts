import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import {
  ApplicationFieldType,
  ApplicationSubmissionReviewStatus,
  CallForApplicationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateCallForApplicationDto } from './dto/create-call-for-application.dto';
import { UpdateCallForApplicationDto } from './dto/update-call-for-application.dto';
import { CreateApplicationFieldDto } from './dto/create-application-field.dto';
import { UpdateApplicationFieldDto } from './dto/update-application-field.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';

const FIELD_SELECT = {
  id: true,
  label: true,
  fieldType: true,
  isRequired: true,
  options: true,
  order: true,
} as const;

// Fields are nested directly on the public campaign read — the public
// application form has no other way to discover which fields to render
// (GET :id/fields is admin-only, and the public page only ever has the
// slug, not the internal id, to work with anyway).
const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  programType: true,
  description: true,
  status: true,
  openDate: true,
  closeDate: true,
  fields: { select: FIELD_SELECT, orderBy: { order: 'asc' as const } },
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  createdAt: true,
  updatedAt: true,
} as const;

// Never selects `answers` — the list view is for scanning volume/status,
// not reading responses (those can be large and are only needed one at a
// time, in getSubmissionById).
const SUBMISSION_LIST_SELECT = {
  id: true,
  callForApplicationId: true,
  applicantName: true,
  applicantEmail: true,
  reviewStatus: true,
  submittedAt: true,
  reviewedById: true,
  reviewedBy: { select: { id: true, email: true } },
} as const;

const SUBMISSION_DETAIL_SELECT = {
  ...SUBMISSION_LIST_SELECT,
  answers: true,
  callForApplication: {
    select: {
      id: true,
      slug: true,
      title: true,
    },
  },
} as const;

@Injectable()
export class CallForApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async listPublic() {
    return this.prisma.callForApplication.findMany({
      where: { status: 'OPEN' },
      select: PUBLIC_SELECT,
      orderBy: { openDate: 'desc' },
    });
  }

  async listAdmin(
    skip: number,
    take: number,
    status?: CallForApplicationStatus,
  ) {
    const where = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.callForApplication.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.callForApplication.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async getBySlug(slug: string) {
    const call = await this.prisma.callForApplication.findUnique({
      where: { slug },
      select: PUBLIC_SELECT,
    });
    if (!call) throw new NotFoundException('Call for application not found');
    return call;
  }

  async getById(id: string) {
    const call = await this.prisma.callForApplication.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!call) throw new NotFoundException('Call for application not found');
    return call;
  }

  async create(
    dto: CreateCallForApplicationDto,
    actorId: string,
    ipAddress?: string,
  ) {
    try {
      const call = await this.prisma.callForApplication.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          programType: dto.programType,
          description: dto.description,
          status: dto.status ?? 'DRAFT',
          openDate: dto.openDate ? new Date(dto.openDate) : null,
          closeDate: dto.closeDate ? new Date(dto.closeDate) : null,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'CallForApplication',
        entityId: call.id,
        actorId,
        after: { slug: call.slug, title: call.title },
        ipAddress,
      });
      return call;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateCallForApplicationDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    try {
      const call = await this.prisma.callForApplication.update({
        where: { id },
        data: {
          ...dto,
          openDate: dto.openDate ? new Date(dto.openDate) : undefined,
          closeDate: dto.closeDate ? new Date(dto.closeDate) : undefined,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'CallForApplication',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(call),
        ipAddress,
      });
      return call;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.callForApplication.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'CallForApplication',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  async listFields(callForApplicationId: string) {
    await this.getById(callForApplicationId);
    return this.prisma.applicationField.findMany({
      where: { callForApplicationId },
      select: FIELD_SELECT,
      orderBy: { order: 'asc' },
    });
  }

  async createField(
    callForApplicationId: string,
    dto: CreateApplicationFieldDto,
    actorId: string,
    ipAddress?: string,
  ) {
    await this.getById(callForApplicationId);
    try {
      const field = await this.prisma.applicationField.create({
        data: {
          callForApplicationId,
          label: dto.label,
          fieldType: dto.fieldType,
          isRequired: dto.isRequired ?? true,
          options: dto.options
            ? (JSON.parse(dto.options) as Prisma.InputJsonValue)
            : undefined,
          order: dto.order ?? 0,
        },
        select: FIELD_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'ApplicationField',
        entityId: field.id,
        actorId,
        after: { label: field.label, fieldType: field.fieldType },
        ipAddress,
      });
      return field;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async updateField(
    id: string,
    dto: UpdateApplicationFieldDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.prisma.applicationField.findUnique({
      where: { id },
      select: FIELD_SELECT,
    });
    if (!before) throw new NotFoundException('Application field not found');
    try {
      const field = await this.prisma.applicationField.update({
        where: { id },
        data: {
          ...dto,
          options: dto.options
            ? (JSON.parse(dto.options) as Prisma.InputJsonValue)
            : undefined,
        },
        select: FIELD_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'ApplicationField',
        entityId: id,
        actorId,
        before: this.fieldAuditSnapshot(before),
        after: this.fieldAuditSnapshot(field),
        ipAddress,
      });
      return field;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async removeField(id: string, actorId: string, ipAddress?: string) {
    const before = await this.prisma.applicationField.findUnique({
      where: { id },
      select: FIELD_SELECT,
    });
    if (!before) throw new NotFoundException('Application field not found');
    await this.prisma.applicationField.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'ApplicationField',
      entityId: id,
      actorId,
      before: this.fieldAuditSnapshot(before),
      ipAddress,
    });
  }

  // --- Application submissions ---------------------------------------

  async submitApplication(slug: string, dto: SubmitApplicationDto) {
    const call = await this.prisma.callForApplication.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        fields: { select: FIELD_SELECT },
      },
    });
    if (!call) throw new NotFoundException('Call for application not found');

    // The campaign's persisted status is the only source of truth for
    // whether it accepts submissions — never trust anything the client
    // sends about campaign state.
    if (call.status !== CallForApplicationStatus.OPEN) {
      throw new BadRequestException(
        'This call for applications is not currently accepting submissions',
      );
    }

    this.validateAnswers(call.fields, dto.answers);

    const submission = await this.prisma.applicationSubmission.create({
      data: {
        callForApplicationId: call.id,
        applicantName: dto.applicantName,
        applicantEmail: dto.applicantEmail,
        answers: dto.answers as Prisma.InputJsonValue,
      },
      select: { id: true, submittedAt: true },
    });

    // Public form submissions (like contact/newsletter elsewhere in this
    // codebase) are not audit-logged — AuditLog is reserved for privileged
    // actions, not anonymous visitor activity. Email confirmation would go
    // through MailService here, but no such notification is part of the
    // agreed V1 contract for this flow, so none is sent.

    return submission;
  }

  async listSubmissions(
    callForApplicationId: string,
    skip: number,
    take: number,
    reviewStatus?: ApplicationSubmissionReviewStatus,
  ) {
    await this.getById(callForApplicationId);

    const where: Prisma.ApplicationSubmissionWhereInput = {
      callForApplicationId,
      ...(reviewStatus ? { reviewStatus } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.applicationSubmission.findMany({
        where,
        select: SUBMISSION_LIST_SELECT,
        orderBy: { submittedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.applicationSubmission.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async getSubmissionById(id: string) {
    const submission = await this.prisma.applicationSubmission.findUnique({
      where: { id },
      select: SUBMISSION_DETAIL_SELECT,
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const fields = await this.prisma.applicationField.findMany({
      where: { callForApplicationId: submission.callForApplicationId },
      select: FIELD_SELECT,
      orderBy: { order: 'asc' },
    });
    const rawAnswers = submission.answers as Record<string, unknown>;

    // Raw fieldId -> value pairs are meaningless without the field's label,
    // so shape them into something a reviewer can actually read.
    const answers = fields.map((field) => ({
      fieldId: field.id,
      label: field.label,
      fieldType: field.fieldType,
      value: rawAnswers[field.id] ?? null,
    }));

    return {
      id: submission.id,
      callForApplicationId: submission.callForApplicationId,
      callForApplication: submission.callForApplication,
      applicantName: submission.applicantName,
      applicantEmail: submission.applicantEmail,
      reviewStatus: submission.reviewStatus,
      reviewedById: submission.reviewedById,
      reviewedBy: submission.reviewedBy,
      submittedAt: submission.submittedAt,
      answers,
    };
  }

  async updateSubmissionStatus(
    id: string,
    reviewStatus: ApplicationSubmissionReviewStatus,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.prisma.applicationSubmission.findUnique({
      where: { id },
      select: { id: true, reviewStatus: true },
    });
    if (!before) throw new NotFoundException('Submission not found');
    if (before.reviewStatus === reviewStatus) {
      throw new BadRequestException(
        `Submission is already in status ${reviewStatus}`,
      );
    }

    const submission = await this.prisma.applicationSubmission.update({
      where: { id },
      data: { reviewStatus, reviewedById: actorId },
      select: SUBMISSION_LIST_SELECT,
    });

    await this.audit.record({
      action: 'SUBMISSION_STATUS_CHANGED',
      entityType: 'ApplicationSubmission',
      entityId: id,
      actorId,
      before: { reviewStatus: before.reviewStatus },
      after: { reviewStatus: submission.reviewStatus },
      ipAddress,
    });

    return submission;
  }

  // Validates a submission's answers against the campaign's real
  // ApplicationField definitions — the only source of truth for which
  // fields exist, which are required, and what values are acceptable.
  // `options` is stored as Json and assumed to be a plain string[] of
  // choices (the only shape ApplicationField's admin CRUD produces).
  private validateAnswers(
    fields: {
      id: string;
      label: string;
      fieldType: ApplicationFieldType;
      isRequired: boolean;
      options: Prisma.JsonValue;
    }[],
    answers: Record<string, unknown>,
  ) {
    const fieldIds = new Set(fields.map((field) => field.id));
    for (const key of Object.keys(answers)) {
      if (!fieldIds.has(key)) {
        throw new BadRequestException(`Unknown application field: ${key}`);
      }
    }

    for (const field of fields) {
      const value = answers[field.id];
      const isEmpty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);

      if (field.isRequired && isEmpty) {
        throw new BadRequestException(`Missing required field: ${field.label}`);
      }
      if (isEmpty) continue;

      const options = Array.isArray(field.options)
        ? field.options.filter(
            (option): option is string => typeof option === 'string',
          )
        : undefined;

      switch (field.fieldType) {
        case ApplicationFieldType.SHORT_TEXT:
        case ApplicationFieldType.LONG_TEXT:
        case ApplicationFieldType.PHONE:
          if (typeof value !== 'string') {
            throw new BadRequestException(
              `Field "${field.label}" must be text`,
            );
          }
          break;
        case ApplicationFieldType.EMAIL:
          if (typeof value !== 'string' || !isEmail(value)) {
            throw new BadRequestException(
              `Field "${field.label}" must be a valid email address`,
            );
          }
          break;
        case ApplicationFieldType.SINGLE_SELECT:
          if (
            typeof value !== 'string' ||
            (options && !options.includes(value))
          ) {
            throw new BadRequestException(
              `Field "${field.label}" has an invalid selection`,
            );
          }
          break;
        case ApplicationFieldType.MULTI_SELECT:
          if (
            !Array.isArray(value) ||
            !value.every(
              (entry) =>
                typeof entry === 'string' &&
                (!options || options.includes(entry)),
            )
          ) {
            throw new BadRequestException(
              `Field "${field.label}" has an invalid selection`,
            );
          }
          break;
      }
    }
  }

  private auditSnapshot(call: { slug: string; title: string; status: string }) {
    return {
      slug: call.slug,
      title: call.title,
      status: call.status,
    };
  }

  private fieldAuditSnapshot(field: { label: string; fieldType: string }) {
    return {
      label: field.label,
      fieldType: field.fieldType,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Call for application slug already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Call for application not found');
      }
    }
    throw error;
  }
}
