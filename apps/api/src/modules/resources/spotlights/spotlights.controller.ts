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
import type { Request } from 'express';
import { PrivilegedRole } from '@prisma/client';
import { SpotlightsService } from './spotlights.service';
import { CreateSpotlightDto } from './dto/create-spotlight.dto';
import { UpdateSpotlightDto } from './dto/update-spotlight.dto';
import { ListSpotlightsDto } from './dto/list-spotlights.dto';
import { SetSpotlightPublicationDto } from './dto/set-spotlight-publication.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { Roles } from '../../identity/auth/decorators/roles.decorator';

@Controller('spotlights')
export class SpotlightsController {
  constructor(private readonly spotlights: SpotlightsService) {}

  // Same validated DTO the admin route uses: bounds `take`, rejects
  // non-numeric or negative values with a 400 instead of letting them reach
  // Prisma and surface as a 500.
  @Get()
  list(@Query() query: ListSpotlightsDto) {
    return this.spotlights.list(query.skip, query.take);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  listAdmin(@Query() query: ListSpotlightsDto) {
    return this.spotlights.listAdmin(query.skip ?? 0, query.take ?? 20);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  getById(@Param('id') id: string) {
    return this.spotlights.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  create(@Body() dto: CreateSpotlightDto, @Req() req: Request) {
    return this.spotlights.create(dto, req.user!.id, req.ip);
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
    @Body() dto: UpdateSpotlightDto,
    @Req() req: Request,
  ) {
    return this.spotlights.update(id, dto, req.user!.id, req.ip);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  publish(@Param('id') id: string, @Req() req: Request) {
    return this.spotlights.setPublished(id, true, req.user!.id, req.ip);
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  unpublish(@Param('id') id: string, @Req() req: Request) {
    return this.spotlights.setPublished(id, false, req.user!.id, req.ip);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  setPublishState(
    @Param('id') id: string,
    @Body() dto: SetSpotlightPublicationDto,
    @Req() req: Request,
  ) {
    return this.spotlights.setPublished(
      id,
      dto.isPublished,
      req.user!.id,
      req.ip,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.spotlights.remove(id, req.user!.id, req.ip);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.spotlights.getBySlug(slug);
  }
}
