import { Module } from '@nestjs/common';
import { SpotlightsController } from './spotlights.controller';
import { SpotlightsService } from './spotlights.service';
import { AuthModule } from '../../identity/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SpotlightsController],
  providers: [SpotlightsService],
})
export class SpotlightsModule {}
