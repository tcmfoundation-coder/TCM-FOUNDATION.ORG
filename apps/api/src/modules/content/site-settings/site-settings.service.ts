import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Public read model — every URL field is nullable on purpose. A null value
// means "not supplied yet," never a guessed/placeholder link (engineering
// instruction: "never invent... social URLs"). The frontend omits the
// corresponding nav item/CTA when a field is null rather than rendering a
// broken or fake link.
@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic() {
    const settings = await this.prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });

    return {
      navigation: settings?.navigation ?? null,
      footer: settings?.footer ?? null,
      newsletterConfig: settings?.newsletterConfig ?? null,
      tcmHubPopup: settings?.tcmHubPopup ?? null,
      tcmTvUrl: settings?.tcmTvUrl ?? null,
      learningHubUrl: settings?.learningHubUrl ?? null,
      donateUrl: settings?.donateUrl ?? null,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
      tagline: settings?.tagline ?? null,
    };
  }
}
