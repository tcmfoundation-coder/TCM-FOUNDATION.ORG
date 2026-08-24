import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const TREND_DAYS = 30;
const RECENT_ACTIVITY_LIMIT = 8;

export interface DailyCount {
  date: string; // YYYY-MM-DD, UTC
  count: number;
}

export interface DashboardAnalytics {
  overview: {
    programs: { total: number; published: number };
    publishedContent: number;
    teamMembers: number;
    mediaFiles: number;
    openApplications: number;
    users?: { total: number; active: number; deactivated: number };
    supportRequests?: { total: number; new: number };
    newsletterSubscribers?: { total: number; subscribed: number };
    contactSubmissions?: { total: number };
    applicationSubmissions?: { total: number; new: number };
    auditLogEntries?: number;
  };
  trends?: {
    userGrowth: DailyCount[];
    applicationSubmissions: DailyCount[];
    supportRequests: DailyCount[];
    newsletterGrowth: DailyCount[];
  };
  recentActivity?: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: Date;
    actor: { id: string; email: string } | null;
  }[];
  generatedAt: string;
}

// Every day in the window is pre-seeded at 0, not just days that had
// activity — a chart built from a sparse map would show a shorter, warped
// x-axis rather than genuine gaps.
function bucketByDay(timestamps: Date[], days: number): DailyCount[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const ts of timestamps) {
    const key = ts.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

/**
 * One consolidated read for the whole admin dashboard, replacing what was
 * previously up to 9 sequential client-side round trips (DashboardMetrics
 * awaited each `tryAdd` one at a time, plus a separate DashboardRecentActivity
 * fetch) with a single request that runs every query concurrently server-side.
 *
 * Section visibility mirrors the exact role gating the old client-side
 * component already enforced (CONTENT_EDITOR sees content counts;
 * ADMINISTRATOR+ additionally sees users/support/newsletter/contact/
 * application data; SUPER_ADMINISTRATOR additionally sees audit-derived
 * data) — moved server-side so a lower-privileged caller's response never
 * contains data they're not authorized to see in the first place, rather
 * than relying on the frontend to hide it. Roles are re-read fresh from the
 * DB per request (same pattern as RolesGuard), not trusted from the token.
 *
 * Uses plain count()/findMany() and Promise.all rather than $transaction:
 * these are independent, non-mutating reads with no cross-query consistency
 * requirement, so true parallel execution across the connection pool
 * minimizes wall-clock latency more than a single-connection transactional
 * batch would. groupBy/$queryRaw were deliberately not introduced — nothing
 * here needs date-truncation in SQL at current data volumes; the day-bucket
 * trends fetch only the timestamp column for the last 30 days and bucket in
 * application code. Revisit with groupBy + raw date-trunc SQL if row counts
 * grow enough that fetching those timestamps stops being cheap.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(userId: string): Promise<DashboardAnalytics> {
    const activeRoles = await this.prisma.userRole.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { role: true },
    });
    const roleNames = activeRoles.map((r) => r.role as string);
    const canManage =
      roleNames.includes('ADMINISTRATOR') ||
      roleNames.includes('SUPER_ADMINISTRATOR');
    const isSuperAdmin = roleNames.includes('SUPER_ADMINISTRATOR');

    const since = new Date(Date.now() - TREND_DAYS * 24 * 60 * 60 * 1000);

    const [
      programsTotal,
      programsPublished,
      blogPublished,
      articlesPublished,
      spotlightsPublished,
      teamMembers,
      mediaFiles,
      openApplications,
    ] = await Promise.all([
      this.prisma.program.count(),
      this.prisma.program.count({ where: { isPublished: true } }),
      this.prisma.blogPost.count({ where: { isPublished: true } }),
      this.prisma.article.count({ where: { isPublished: true } }),
      this.prisma.spotlight.count({ where: { isPublished: true } }),
      this.prisma.teamMember.count(),
      this.prisma.media.count(),
      this.prisma.callForApplication.count({ where: { status: 'OPEN' } }),
    ]);

    const overview: DashboardAnalytics['overview'] = {
      programs: { total: programsTotal, published: programsPublished },
      publishedContent: blogPublished + articlesPublished + spotlightsPublished,
      teamMembers,
      mediaFiles,
      openApplications,
    };

    let trends: DashboardAnalytics['trends'];

    if (canManage) {
      const [
        usersTotal,
        usersDeactivated,
        supportTotal,
        supportNew,
        newsletterTotal,
        newsletterSubscribed,
        contactTotal,
        submissionsTotal,
        submissionsNew,
        userTimestamps,
        submissionTimestamps,
        supportTimestamps,
        newsletterTimestamps,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { deactivatedAt: { not: null } } }),
        this.prisma.supportRequest.count(),
        this.prisma.supportRequest.count({ where: { status: 'NEW' } }),
        this.prisma.newsletterSubscriber.count(),
        this.prisma.newsletterSubscriber.count({
          where: { status: 'SUBSCRIBED' },
        }),
        this.prisma.contactSubmission.count(),
        this.prisma.applicationSubmission.count(),
        this.prisma.applicationSubmission.count({
          where: { reviewStatus: 'NEW' },
        }),
        this.prisma.user.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true },
        }),
        this.prisma.applicationSubmission.findMany({
          where: { submittedAt: { gte: since } },
          select: { submittedAt: true },
        }),
        this.prisma.supportRequest.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true },
        }),
        this.prisma.newsletterSubscriber.findMany({
          where: { subscribedAt: { gte: since } },
          select: { subscribedAt: true },
        }),
      ]);

      overview.users = {
        total: usersTotal,
        active: usersTotal - usersDeactivated,
        deactivated: usersDeactivated,
      };
      overview.supportRequests = { total: supportTotal, new: supportNew };
      overview.newsletterSubscribers = {
        total: newsletterTotal,
        subscribed: newsletterSubscribed,
      };
      overview.contactSubmissions = { total: contactTotal };
      overview.applicationSubmissions = {
        total: submissionsTotal,
        new: submissionsNew,
      };

      trends = {
        userGrowth: bucketByDay(
          userTimestamps.map((u) => u.createdAt),
          TREND_DAYS,
        ),
        applicationSubmissions: bucketByDay(
          submissionTimestamps.map((s) => s.submittedAt),
          TREND_DAYS,
        ),
        supportRequests: bucketByDay(
          supportTimestamps.map((s) => s.createdAt),
          TREND_DAYS,
        ),
        newsletterGrowth: bucketByDay(
          newsletterTimestamps.map((n) => n.subscribedAt),
          TREND_DAYS,
        ),
      };
    }

    let recentActivity: DashboardAnalytics['recentActivity'];

    if (isSuperAdmin) {
      const [auditTotal, recent] = await Promise.all([
        this.prisma.auditLog.count(),
        this.prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: RECENT_ACTIVITY_LIMIT,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
            actor: { select: { id: true, email: true } },
          },
        }),
      ]);
      overview.auditLogEntries = auditTotal;
      recentActivity = recent;
    }

    return {
      overview,
      trends,
      recentActivity,
      generatedAt: new Date().toISOString(),
    };
  }
}
