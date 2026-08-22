import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PrivilegedRole } from '@prisma/client';
import { SupportLabService } from './support-lab.service';
import { SubmitSupportRequestDto } from './dto/submit-support-request.dto';
import { ListSupportRequestsDto } from './dto/list-support-requests.dto';
import { UpdateSupportRequestStatusDto } from './dto/update-support-request-status.dto';
import { AssignSupportRequestHandlerDto } from './dto/assign-support-request-handler.dto';
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

@Controller('support-requests')
export class SupportRequestsController {
  constructor(private readonly supportLab: SupportLabService) {}

  // Public — anonymous visitors submit requests for a service.
  @Post()
  @Throttle(PUBLIC_WRITE_THROTTLE)
  @UseGuards(TurnstileGuard)
  submit(@Body() dto: SubmitSupportRequestDto) {
    return this.supportLab.submit(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  list(@Query() query: ListSupportRequestsDto) {
    return this.supportLab.list(
      query.skip ?? 0,
      query.take ?? 25,
      query.status,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getById(@Param('id') id: string) {
    return this.supportLab.getById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSupportRequestStatusDto,
    @Req() req: Request,
  ) {
    return this.supportLab.updateStatus(id, dto.status, req.user!.id, req.ip);
  }

  @Patch(':id/handler')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  assignHandler(
    @Param('id') id: string,
    @Body() dto: AssignSupportRequestHandlerDto,
    @Req() req: Request,
  ) {
    return this.supportLab.assignHandler(
      id,
      dto.handledById,
      req.user!.id,
      req.ip,
    );
  }
}
