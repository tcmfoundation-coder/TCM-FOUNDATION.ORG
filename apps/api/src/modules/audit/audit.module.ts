import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

// Global: RolesGuard (used by every admin-guarded controller across
// domains) now depends on AuditLogService to record authorization
// failures, so every future module that guards a route with RolesGuard
// needs it in scope — global registration avoids a DI footgun where
// forgetting to import AuditLogModule in a new content module would crash
// at boot instead of at review time.
@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
