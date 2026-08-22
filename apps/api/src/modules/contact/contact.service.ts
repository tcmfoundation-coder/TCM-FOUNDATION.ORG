import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateContactSubmissionDto } from './dto/create-contact-submission.dto';

const SUBMISSION_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  organization: true,
  subject: true,
  message: true,
  createdAt: true,
} as const;

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: CreateContactSubmissionDto): Promise<{ success: true }> {
    await this.prisma.contactSubmission.create({ data: dto });
    // Staff email notification is deferred until a transactional email
    // provider is chosen (plan Open Question #1) — the submission is real
    // and persisted regardless; this is a delivery-channel gap, not a fake
    // workflow (same reasoning as ConsoleMailAdapter in the Auth module).
    return { success: true };
  }

  async list(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactSubmission.findMany({
        select: SUBMISSION_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.contactSubmission.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const submission = await this.prisma.contactSubmission.findUnique({
      where: { id },
      select: SUBMISSION_SELECT,
    });
    if (!submission)
      throw new NotFoundException('Contact submission not found');
    return submission;
  }
}
