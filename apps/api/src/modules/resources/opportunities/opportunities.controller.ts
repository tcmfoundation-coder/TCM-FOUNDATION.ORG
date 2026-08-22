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
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { ListOpportunitiesDto } from './dto/list-opportunities.dto';
import { SetOpportunityPublicationDto } from './dto/set-opportunity-publication.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { Roles } from '../../identity/auth/decorators/roles.decorator';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  // Same validated DTO the admin route uses: @IsEnum covers `type` (replacing
  // the hand-rolled check that used to live here) and skip/take are bounded,
  // so non-numeric or negative values are rejected with a 400 rather than
  // reaching Prisma and surfacing as a 500.
  @Get()
  list(@Query() query: ListOpportunitiesDto) {
    return this.opportunities.list(query.type, query.skip, query.take);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  listAdmin(@Query() query: ListOpportunitiesDto) {
    return this.opportunities.listAdmin(
      query.skip ?? 0,
      query.take ?? 25,
      query.type,
    );
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  getById(@Param('id') id: string) {
    return this.opportunities.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  create(@Body() dto: CreateOpportunityDto, @Req() req: Request) {
    return this.opportunities.create(dto, req.user!.id, req.ip);
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
    @Body() dto: UpdateOpportunityDto,
    @Req() req: Request,
  ) {
    return this.opportunities.update(id, dto, req.user!.id, req.ip);
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
    @Body() dto: SetOpportunityPublicationDto,
    @Req() req: Request,
  ) {
    return this.opportunities.setPublished(
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
    await this.opportunities.remove(id, req.user!.id, req.ip);
  }

  // Declared last so the literal routes above ('admin', 'id/:id') are not
  // swallowed by this catch-all slug parameter.
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.opportunities.getBySlug(slug);
  }
}
