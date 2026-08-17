import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrivilegedRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { RolesService } from './roles.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RevokeRoleDto } from './dto/revoke-role.dto';
import { VerifyMfaEnrollmentDto } from './dto/verify-mfa-enrollment.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('me')
  getMyRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.roles.getMyRoles(user.id);
  }

  @Post('mfa/setup')
  @HttpCode(200)
  setupMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.roles.setupMfa(user.id, user.email);
  }

  @Post('mfa/enroll-verify')
  @HttpCode(200)
  verifyMfaEnrollment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyMfaEnrollmentDto,
  ) {
    return this.roles.verifyMfaEnrollment(user.id, dto.code);
  }

  @Post('assign')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(PrivilegedRole.SUPER_ADMINISTRATOR)
  assignRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: AssignRoleDto,
  ) {
    return this.roles.assignRole(actor.id, dto.userId, dto.role);
  }

  @Post('revoke')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(PrivilegedRole.SUPER_ADMINISTRATOR)
  revokeRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: RevokeRoleDto,
  ) {
    return this.roles.revokeRole(actor.id, dto.userId, dto.role);
  }
}
