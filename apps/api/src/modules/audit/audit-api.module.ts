import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuthModule } from '../identity/auth/auth.module';

// Separate from AuditLogModule (see that file's comment) purely to avoid a
// circular import: AuthModule already imports AuditLogModule for
// RolesGuard, so this controller's own need for AuthModule's guards has to
// live in a different module. AuditLogService is still available here
// without an explicit import — AuditLogModule is @Global().
@Module({
  imports: [AuthModule],
  controllers: [AuditLogController],
})
export class AuditModule {}
