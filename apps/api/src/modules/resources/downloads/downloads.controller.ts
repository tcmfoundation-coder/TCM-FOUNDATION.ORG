import { Controller, Get, Param, Query } from '@nestjs/common';
import { DownloadsService } from './downloads.service';

@Controller('downloads')
export class DownloadsController {
  constructor(private readonly downloads: DownloadsService) {}

  @Get()
  list(@Query('take') take?: string) {
    return this.downloads.list(take ? Number.parseInt(take, 10) : undefined);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.downloads.getBySlug(slug);
  }
}
