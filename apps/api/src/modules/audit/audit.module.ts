import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

// Global: RolesGuard (used by every admin-guarded controller across
// domains) now depends on AuditLogService to record authorization
// failures, so every future module that guards a route with RolesGuard
// needs it in scope — global registration avoids a DI footgun where
// forgetting to import AuditLogModule in a new content module would crash
// at boot instead of at review time.
//
// Deliberately no controller here: AuthModule imports this module (for
// RolesGuard's AuditLogService dependency), so a controller needing
// AuthModule's JwtAuthGuard/RolesGuard would create a circular module
// import. The read API lives in the sibling AuditModule instead, which
// depends on AuthModule one-way and picks up AuditLogService for free
// since this module is global.
@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
