import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrivilegedRole } from '@prisma/client';
import { SupportLabService } from './support-lab.service';
import { CreateSupportServiceDto } from './dto/create-support-service.dto';
import { UpdateSupportServiceDto } from './dto/update-support-service.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/auth/guards/roles.guard';
import { Roles } from '../identity/auth/decorators/roles.decorator';

@Controller('support-services')
export class SupportServicesController {
  constructor(private readonly supportLab: SupportLabService) {}

  // Public — read-only, e.g. for a future "book a session" service picker.
  @Get()
  list() {
    return this.supportLab.listServices();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  create(@Body() dto: CreateSupportServiceDto, @Req() req: Request) {
    return this.supportLab.createService(dto, req.user!.id, req.ip);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupportServiceDto,
    @Req() req: Request,
  ) {
    return this.supportLab.updateService(id, dto, req.user!.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.SUPER_ADMINISTRATOR)
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.supportLab.removeService(id, req.user!.id, req.ip);
  }
}
