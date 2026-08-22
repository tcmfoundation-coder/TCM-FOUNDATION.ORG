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
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ListProgramsDto } from './dto/list-programs.dto';
import { SetProgramPublicationDto } from './dto/set-program-publication.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { Roles } from '../../identity/auth/decorators/roles.decorator';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  // Same validated DTO the admin route uses: bounds `take`, rejects
  // non-numeric or negative values with a 400 instead of letting them reach
  // Prisma and surface as a 500.
  @Get()
  list(@Query() query: ListProgramsDto) {
    return this.programs.list(query.skip, query.take);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  listAdmin(@Query() query: ListProgramsDto) {
    return this.programs.listAdmin(query.skip, query.take);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  getById(@Param('id') id: string) {
    return this.programs.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  create(@Body() dto: CreateProgramDto, @Req() req: Request) {
    return this.programs.create(dto, req.user!.id, req.ip);
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
    @Body() dto: UpdateProgramDto,
    @Req() req: Request,
  ) {
    return this.programs.update(id, dto, req.user!.id, req.ip);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  publish(@Param('id') id: string, @Req() req: Request) {
    return this.programs.setPublished(id, true, req.user!.id, req.ip);
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  unpublish(@Param('id') id: string, @Req() req: Request) {
    return this.programs.setPublished(id, false, req.user!.id, req.ip);
  }

  // Compatibility with Devin's already-written client contract.
  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  setPublishState(
    @Param('id') id: string,
    @Body() dto: SetProgramPublicationDto,
    @Req() req: Request,
  ) {
    return this.programs.setPublished(
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
    await this.programs.remove(id, req.user!.id, req.ip);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.programs.getBySlug(slug);
  }
}
