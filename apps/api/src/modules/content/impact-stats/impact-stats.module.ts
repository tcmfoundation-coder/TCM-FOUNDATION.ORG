import { Module } from '@nestjs/common';
import { ImpactStatsController } from './impact-stats.controller';
import { ImpactStatsService } from './impact-stats.service';
import { AuthModule } from '../../identity/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ImpactStatsController],
  providers: [ImpactStatsService],
})
export class ImpactStatsModule {}
