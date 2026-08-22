import { Module } from '@nestjs/common';
import { CallForApplicationsController } from './call-for-applications.controller';
import { CallForApplicationsService } from './call-for-applications.service';
import { AuthModule } from '../../identity/auth/auth.module';
import { TurnstileModule } from '../../security/turnstile/turnstile.module';

@Module({
  imports: [AuthModule, TurnstileModule],
  controllers: [CallForApplicationsController],
  providers: [CallForApplicationsService],
})
export class CallForApplicationsModule {}
