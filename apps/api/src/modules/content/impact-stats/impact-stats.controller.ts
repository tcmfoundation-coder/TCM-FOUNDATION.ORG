import { Controller, Get } from '@nestjs/common';
import { ImpactStatsService } from './impact-stats.service';

@Controller('impact-stats')
export class ImpactStatsController {
  constructor(private readonly impactStats: ImpactStatsService) {}

  @Get()
  list() {
    return this.impactStats.list();
  }
}
