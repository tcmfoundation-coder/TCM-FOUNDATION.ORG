import { Module } from '@nestjs/common';
import { SupportRequestsController } from './support-requests.controller';
import { SupportServicesController } from './support-services.controller';
import { SupportLabService } from './support-lab.service';
import { AuthModule } from '../identity/auth/auth.module';
import { TurnstileModule } from '../security/turnstile/turnstile.module';

@Module({
  imports: [AuthModule, TurnstileModule],
  controllers: [SupportRequestsController, SupportServicesController],
  providers: [SupportLabService],
})
export class SupportLabModule {}
