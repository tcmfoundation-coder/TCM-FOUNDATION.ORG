import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateContactSubmissionDto } from './dto/create-contact-submission.dto';

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
}
