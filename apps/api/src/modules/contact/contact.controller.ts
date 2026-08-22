import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrivilegedRole } from '@prisma/client';
import { ContactService } from './contact.service';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto';
import { ListContactSubmissionsDto } from './dto/list-contact-submissions.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/auth/guards/roles.guard';
import { Roles } from '../identity/auth/decorators/roles.decorator';
import { TurnstileGuard } from '../security/turnstile/turnstile.guard';
import { PUBLIC_WRITE_THROTTLE } from '../security/throttle.constants';

const STAFF_ROLES = [
  PrivilegedRole.CONTENT_EDITOR,
  PrivilegedRole.ADMINISTRATOR,
  PrivilegedRole.SUPER_ADMINISTRATOR,
];

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  // Public — anonymous visitors submit general inquiries.
  @Post()
  @HttpCode(200)
  @Throttle(PUBLIC_WRITE_THROTTLE)
  @UseGuards(TurnstileGuard)
  submit(@Body() dto: CreateContactSubmissionDto) {
    return this.contact.submit(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  list(@Query() query: ListContactSubmissionsDto) {
    return this.contact.list(query.skip ?? 0, query.take ?? 25);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getById(@Param('id') id: string) {
    return this.contact.getById(id);
  }
}
