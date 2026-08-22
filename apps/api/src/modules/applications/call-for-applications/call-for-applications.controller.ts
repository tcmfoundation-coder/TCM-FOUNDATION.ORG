import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { CallForApplicationsService } from './call-for-applications.service';
import { CreateCallForApplicationDto } from './dto/create-call-for-application.dto';
import { UpdateCallForApplicationDto } from './dto/update-call-for-application.dto';
import { ListCallForApplicationsDto } from './dto/list-call-for-applications.dto';
import { CreateApplicationFieldDto } from './dto/create-application-field.dto';
import { UpdateApplicationFieldDto } from './dto/update-application-field.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ListApplicationSubmissionsDto } from './dto/list-application-submissions.dto';
import { UpdateApplicationSubmissionStatusDto } from './dto/update-application-submission-status.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { Roles } from '../../identity/auth/decorators/roles.decorator';
import { TurnstileGuard } from '../../security/turnstile/turnstile.guard';
import { PUBLIC_WRITE_THROTTLE } from '../../security/throttle.constants';

@Controller('call-for-applications')
export class CallForApplicationsController {
  constructor(
    private readonly callForApplications: CallForApplicationsService,
  ) {}

  @Get()
  listPublic() {
    return this.callForApplications.listPublic();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  listAdmin(@Query() query: ListCallForApplicationsDto) {
    return this.callForApplications.listAdmin(
      query.skip ?? 0,
      query.take ?? 25,
      query.status,
    );
  }

  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.callForApplications.getBySlug(slug);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  getById(@Param('id') id: string) {
    return this.callForApplications.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  create(@Body() dto: CreateCallForApplicationDto, @Req() req: Request) {
    return this.callForApplications.create(dto, req.user!.id, req.ip);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCallForApplicationDto,
    @Req() req: Request,
  ) {
    return this.callForApplications.update(id, dto, req.user!.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.callForApplications.remove(id, req.user!.id, req.ip);
  }

  @Get(':id/fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  listFields(@Param('id') id: string) {
    return this.callForApplications.listFields(id);
  }

  @Post(':id/fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  createField(
    @Param('id') id: string,
    @Body() dto: CreateApplicationFieldDto,
    @Req() req: Request,
  ) {
    return this.callForApplications.createField(id, dto, req.user!.id, req.ip);
  }

  @Patch('fields/:fieldId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  updateField(
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateApplicationFieldDto,
    @Req() req: Request,
  ) {
    return this.callForApplications.updateField(
      fieldId,
      dto,
      req.user!.id,
      req.ip,
    );
  }

  @Delete('fields/:fieldId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  async removeField(@Param('fieldId') fieldId: string, @Req() req: Request) {
    await this.callForApplications.removeField(fieldId, req.user!.id, req.ip);
  }

  // No guards — public applicants submit anonymously, matching the public
  // GET routes above.
  @Post('slug/:slug/submissions')
  @Throttle(PUBLIC_WRITE_THROTTLE)
  @UseGuards(TurnstileGuard)
  submitApplication(
    @Param('slug') slug: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.callForApplications.submitApplication(slug, dto);
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  listSubmissions(
    @Param('id') id: string,
    @Query() query: ListApplicationSubmissionsDto,
  ) {
    return this.callForApplications.listSubmissions(
      id,
      query.skip ?? 0,
      query.take ?? 25,
      query.reviewStatus,
    );
  }

  @Get('submissions/:submissionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  getSubmission(@Param('submissionId') submissionId: string) {
    return this.callForApplications.getSubmissionById(submissionId);
  }

  @Patch('submissions/:submissionId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  updateSubmissionStatus(
    @Param('submissionId') submissionId: string,
    @Body() dto: UpdateApplicationSubmissionStatusDto,
    @Req() req: Request,
  ) {
    return this.callForApplications.updateSubmissionStatus(
      submissionId,
      dto.reviewStatus,
      req.user!.id,
      req.ip,
    );
  }
}
