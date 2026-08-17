import { Controller, Get, Param, Query } from '@nestjs/common';
import { SpotlightsService } from './spotlights.service';

@Controller('spotlights')
export class SpotlightsController {
  constructor(private readonly spotlights: SpotlightsService) {}

  @Get()
  list(@Query('take') take?: string) {
    return this.spotlights.list(take ? Number.parseInt(take, 10) : undefined);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.spotlights.getBySlug(slug);
  }
}
