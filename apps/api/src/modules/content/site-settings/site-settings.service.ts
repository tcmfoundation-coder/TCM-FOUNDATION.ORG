import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';

// Public read model — every URL field is nullable on purpose. A null value
// means "not supplied yet," never a guessed/placeholder link (engineering
// instruction: "never invent... social URLs"). The frontend omits the
// corresponding nav item/CTA when a field is null rather than rendering a
// broken or fake link.
@Injectable()
export class SiteSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async getPublic() {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });

    return this.toPublicShape(settings);
  }

  // Upsert, not update: the singleton row is created lazily on first write
  // rather than requiring a separate seed step — getPublic() already
  // tolerates a missing row (falls back to all-null), so there's nothing
  // that depends on the row existing beforehand.
  async update(
    dto: UpdateSiteSettingsDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });

    const data = dto as Prisma.SiteSettingsUpdateInput &
      Prisma.SiteSettingsCreateInput;
    const updated = await this.prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });

    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'SiteSettings',
      entityId: 'singleton',
      actorId,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(updated),
      ipAddress,
    });

    return this.toPublicShape(updated);
  }

  private toPublicShape(
    settings: {
      navigation: Prisma.JsonValue;
      footer: Prisma.JsonValue;
      newsletterConfig: Prisma.JsonValue;
      tcmHubPopup: Prisma.JsonValue;
      brandTokens: Prisma.JsonValue;
      tcmTvUrl: string | null;
      learningHubUrl: string | null;
      donateUrl: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      tagline: string | null;
    } | null,
  ) {
    return {
      navigation: settings?.navigation ?? null,
      footer: settings?.footer ?? null,
      newsletterConfig: settings?.newsletterConfig ?? null,
      tcmHubPopup: settings?.tcmHubPopup ?? null,
      brandTokens: settings?.brandTokens ?? null,
      tcmTvUrl: settings?.tcmTvUrl ?? null,
      learningHubUrl: settings?.learningHubUrl ?? null,
      donateUrl: settings?.donateUrl ?? null,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
      tagline: settings?.tagline ?? null,
    };
  }

  // Nothing on this model is sensitive, so the full row (minus id/updatedAt,
  // which aren't meaningful "before/after" state) is fine to snapshot.
  private auditSnapshot(
    settings: {
      navigation: Prisma.JsonValue;
      footer: Prisma.JsonValue;
      newsletterConfig: Prisma.JsonValue;
      tcmHubPopup: Prisma.JsonValue;
      brandTokens: Prisma.JsonValue;
      tcmTvUrl: string | null;
      learningHubUrl: string | null;
      donateUrl: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      tagline: string | null;
    } | null,
  ): Prisma.InputJsonValue | undefined {
    if (!settings) return undefined;
    return {
      navigation: settings.navigation,
      footer: settings.footer,
      newsletterConfig: settings.newsletterConfig,
      tcmHubPopup: settings.tcmHubPopup,
      brandTokens: settings.brandTokens,
      tcmTvUrl: settings.tcmTvUrl,
      learningHubUrl: settings.learningHubUrl,
      donateUrl: settings.donateUrl,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      tagline: settings.tagline,
    };
  }
}
