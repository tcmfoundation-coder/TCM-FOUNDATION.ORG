import {
  BadRequestException,
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
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { PrivilegedRole } from '@prisma/client';
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ListMediaDto } from './dto/list-media.dto';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/auth/guards/roles.guard';
import { Roles } from '../identity/auth/decorators/roles.decorator';
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_UPLOAD_BYTES,
} from './media.constants';
import {
  buildContentDisposition,
  buildDownloadFilename,
} from './download-filename.util';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  list(@Query() query: ListMediaDto) {
    return this.media.list(query.skip ?? 0, query.take ?? 25, query.type);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  getById(@Param('id') id: string) {
    return this.media.getById(id);
  }

  // The API is the only thing the browser ever talks to for a download —
  // see media.service.ts's streamById doc comment for why (a Cloudinary URL
  // handed straight to the browser broke in production and can't reliably
  // force a download cross-origin anyway). Genuinely streams the bytes
  // through, never buffers the whole file in memory.
  @Get(':id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  async download(@Param('id') id: string): Promise<StreamableFile> {
    const media = await this.media.getById(id);
    const { stream, contentType, contentLength, extension } =
      await this.media.streamById(id);
    const filename = buildDownloadFilename(media.altText, extension);
    return new StreamableFile(stream, {
      type: contentType,
      disposition: buildContentDisposition(filename),
      length: contentLength,
    });
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_MEDIA_UPLOAD_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MEDIA_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(`Unsupported file type: ${file.mimetype}`),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.media.upload(file, dto.altText, req.user!.id, req.ip);
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
    @Body() dto: UpdateMediaDto,
    @Req() req: Request,
  ) {
    return this.media.update(id, dto, req.user!.id, req.ip);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  async remove(@Param('id') id: string, @Req() req: Request) {
    await this.media.remove(id, req.user!.id, req.ip);
  }
}
