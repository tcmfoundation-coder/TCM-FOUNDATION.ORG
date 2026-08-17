import { Module } from '@nestjs/common';
import { ImpactStatsController } from './impact-stats.controller';
import { ImpactStatsService } from './impact-stats.service';

@Module({
  controllers: [ImpactStatsController],
  providers: [ImpactStatsService],
})
export class ImpactStatsModule {}
