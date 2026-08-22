import { Module } from '@nestjs/common';
import { TurnstileService } from './turnstile.service';
import { TurnstileGuard } from './turnstile.guard';

// Imported by the modules owning public write endpoints (contact, newsletter,
// support-lab, call-for-applications) rather than registered globally — only
// those four routes are protected, so the dependency stays visible at each
// call site.
@Module({
  providers: [TurnstileService, TurnstileGuard],
  exports: [TurnstileService, TurnstileGuard],
})
export class TurnstileModule {}
