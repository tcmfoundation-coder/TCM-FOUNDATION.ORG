import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrivilegedRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/auth/guards/roles.guard';
import { Roles } from '../identity/auth/decorators/roles.decorator';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../identity/auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  // Lowest of the three tiers the response can contain data for — any
  // active admin role may call this. DashboardService itself re-checks the
  // caller's actual active roles and only computes/returns the sections
  // that role is allowed to see (see its class doc comment).
  @Get('analytics')
  @Roles(
    PrivilegedRole.CONTENT_EDITOR,
    PrivilegedRole.ADMINISTRATOR,
    PrivilegedRole.SUPER_ADMINISTRATOR,
  )
  getAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getAnalytics(user.id);
  }
}
