import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { MailModule } from './modules/mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './modules/identity/auth/auth.module';
import { UsersModule } from './modules/identity/users/users.module';
import { RolesModule } from './modules/identity/roles/roles.module';

import { ProgramsModule } from './modules/content/programs/programs.module';
import { TeamModule } from './modules/content/team/team.module';
import { PartnersModule } from './modules/content/partners/partners.module';
import { TestimonialsModule } from './modules/content/testimonials/testimonials.module';
import { FaqModule } from './modules/content/faq/faq.module';
import { SiteSettingsModule } from './modules/content/site-settings/site-settings.module';
import { ImpactStatsModule } from './modules/content/impact-stats/impact-stats.module';

import { BlogModule } from './modules/resources/blog/blog.module';
import { ArticlesModule } from './modules/resources/articles/articles.module';
import { SpotlightsModule } from './modules/resources/spotlights/spotlights.module';
import { CategoriesModule } from './modules/resources/categories/categories.module';
import { DownloadsModule } from './modules/resources/downloads/downloads.module';
import { OpportunitiesModule } from './modules/resources/opportunities/opportunities.module';
import { SearchModule } from './modules/resources/search/search.module';

import { CallForApplicationsModule } from './modules/applications/call-for-applications/call-for-applications.module';
import { SupportLabModule } from './modules/support-lab/support-lab.module';
import { ContactModule } from './modules/contact/contact.module';

import { NewsletterModule } from './modules/engagement/newsletter/newsletter.module';
import { SocialLinksModule } from './modules/engagement/social-links/social-links.module';

import { MediaModule } from './modules/media/media.module';
import { AuditLogModule } from './modules/audit/audit.module';
import { AuditModule } from './modules/audit/audit-api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    MailModule,

    // Identity domain
    AuthModule,
    UsersModule,
    RolesModule,

    // Content domain
    ProgramsModule,
    TeamModule,
    PartnersModule,
    TestimonialsModule,
    FaqModule,
    SiteSettingsModule,
    ImpactStatsModule,

    // Resources domain
    BlogModule,
    ArticlesModule,
    SpotlightsModule,
    CategoriesModule,
    DownloadsModule,
    OpportunitiesModule,
    SearchModule,

    // Applications domain
    CallForApplicationsModule,

    // Support Lab domain
    SupportLabModule,

    // Contact domain
    ContactModule,

    // Engagement domain
    NewsletterModule,
    SocialLinksModule,

    // Media domain
    MediaModule,

    // Audit domain
    AuditLogModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
