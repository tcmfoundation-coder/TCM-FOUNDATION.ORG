import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PrivilegedRole } from '@prisma/client';
import { SiteSettingsService } from './site-settings.service';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { Roles } from '../../identity/auth/decorators/roles.decorator';

@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettings: SiteSettingsService) {}

  @Get()
  getPublic() {
    return this.siteSettings.getPublic();
  }

  // Site-wide navigation/footer/branding/contact config is an
  // administration concern, not routine content editing — ADMINISTRATOR+
  // matches the tier used for Users & Roles management, one step above the
  // CONTENT_EDITOR+ tier used for Programs/Blog/etc.
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  update(@Body() dto: UpdateSiteSettingsDto, @Req() req: Request) {
    return this.siteSettings.update(dto, req.user!.id, req.ip);
  }
}
