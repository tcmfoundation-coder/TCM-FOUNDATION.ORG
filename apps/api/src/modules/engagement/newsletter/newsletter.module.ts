import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { TurnstileModule } from '../../security/turnstile/turnstile.module';
import { AuthModule } from '../../identity/auth/auth.module';

// AuthModule supplies JwtAuthGuard/RolesGuard for the admin subscribers list.
// MailService arrives via the global MailModule, so it needs no import here.
@Module({
  imports: [TurnstileModule, AuthModule],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
