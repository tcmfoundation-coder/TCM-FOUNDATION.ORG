import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrivilegedRole } from '@prisma/client';
import { DownloadsService } from './downloads.service';
import { CreateDownloadDto } from './dto/create-download.dto';
import { UpdateDownloadDto } from './dto/update-download.dto';
import { ListDownloadsDto } from './dto/list-downloads.dto';
import { SetDownloadPublicationDto } from './dto/set-download-publication.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { Roles } from '../../identity/auth/decorators/roles.decorator';
import { MediaService } from '../../media/media.service';
import {
  buildContentDisposition,
  buildDownloadFilename,
} from '../../media/download-filename.util';

@Controller('downloads')
export class DownloadsController {
  constructor(
    private readonly downloads: DownloadsService,
    private readonly media: MediaService,
  ) {}

  // Same validated DTO the admin route uses — see the note on the other
  // public list routes.
  @Get()
  list(@Query() query: ListDownloadsDto) {
    return this.downloads.list(query.take);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  listAdmin(@Query() query: ListDownloadsDto) {
    return this.downloads.listAdmin(query.skip ?? 0, query.take ?? 25);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  getById(@Param('id') id: string) {
    return this.downloads.getById(id);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.downloads.getBySlug(slug);
  }

  // The API is the only thing the browser ever talks to for a download —
  // getBySlug already 404s for a missing/unpublished download, so this
  // inherits the same public-visibility rule as the metadata route. See
  // media.service.ts's streamById doc comment for why this replaced handing
  // the browser a Cloudinary URL directly (it broke in production, and a
  // cross-origin link can't reliably force a download anyway).
  @Get(':slug/file')
  async downloadFile(@Param('slug') slug: string): Promise<StreamableFile> {
    const download = await this.downloads.getBySlug(slug);
    if (!download.file) {
      throw new NotFoundException('This resource has no file attached yet');
    }
    const { stream, contentType, contentLength, extension } =
      await this.media.streamById(download.file.id);
    const filename = buildDownloadFilename(download.title, extension);
    return new StreamableFile(stream, {
      type: contentType,
      disposition: buildContentDisposition(filename),
      length: contentLength,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  create(@Body() dto: CreateDownloadDto, @Req() req: Request) {
    return this.downloads.create(dto, req.user!.id, req.ip);
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
    @Body() dto: UpdateDownloadDto,
    @Req() req: Request,
  ) {
    return this.downloads.update(id, dto, req.user!.id, req.ip);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  setPublished(
    @Param('id') id: string,
    @Body() dto: SetDownloadPublicationDto,
    @Req() req: Request,
  ) {
    return this.downloads.setPublished(
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
    await this.downloads.remove(id, req.user!.id, req.ip);
  }
}
