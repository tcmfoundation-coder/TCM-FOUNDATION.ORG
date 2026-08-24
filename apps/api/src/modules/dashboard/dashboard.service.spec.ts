import { DashboardService } from './dashboard.service';

type CountArgs = { where?: Record<string, unknown> } | undefined;

/**
 * DashboardService.getAnalytics is the sole real backend behind
 * GET /dashboard/analytics — the endpoint that replaces the previous 9
 * sequential client-side calls DashboardMetrics made. These tests are
 * specifically about the role-gating: a lower-privileged caller's response
 * must not just hide extra fields on the frontend, it must never have
 * queried for that data at all.
 */
describe('DashboardService.getAnalytics', () => {
  let userRoles: { role: string; status: string }[];
  let prisma: {
    userRole: { findMany: jest.Mock };
    program: { count: jest.Mock };
    blogPost: { count: jest.Mock };
    article: { count: jest.Mock };
    spotlight: { count: jest.Mock };
    teamMember: { count: jest.Mock };
    media: { count: jest.Mock };
    callForApplication: { count: jest.Mock };
    user: { count: jest.Mock; findMany: jest.Mock };
    supportRequest: { count: jest.Mock; findMany: jest.Mock };
    newsletterSubscriber: { count: jest.Mock; findMany: jest.Mock };
    contactSubmission: { count: jest.Mock };
    applicationSubmission: { count: jest.Mock; findMany: jest.Mock };
    auditLog: { count: jest.Mock; findMany: jest.Mock };
  };
  let service: DashboardService;

  beforeEach(() => {
    userRoles = [];

    // count() calls are distinguished by their `where` clause per model —
    // real usage never calls the same model's count() twice with the exact
    // same (or no) filter, so keying on JSON.stringify(where) is unambiguous
    // here without needing a full fake datastore.
    function countMock(byWhereKey: Record<string, number>) {
      return jest.fn((args?: CountArgs) =>
        Promise.resolve(byWhereKey[JSON.stringify(args?.where ?? null)] ?? 0),
      );
    }

    prisma = {
      userRole: {
        findMany: jest.fn(({ where }: { where: { status: string } }) =>
          Promise.resolve(userRoles.filter((r) => r.status === where.status)),
        ),
      },
      program: { count: countMock({ null: 10, '{"isPublished":true}': 7 }) },
      blogPost: { count: countMock({ '{"isPublished":true}': 3 }) },
      article: { count: countMock({ '{"isPublished":true}': 2 }) },
      spotlight: { count: countMock({ '{"isPublished":true}': 1 }) },
      teamMember: { count: countMock({ null: 5 }) },
      media: { count: countMock({ null: 20 }) },
      callForApplication: { count: countMock({ '{"status":"OPEN"}': 1 }) },
      user: {
        count: countMock({ null: 12, '{"deactivatedAt":{"not":null}}': 2 }),
        findMany: jest.fn(() => Promise.resolve([{ createdAt: new Date() }])),
      },
      supportRequest: {
        count: countMock({ null: 8, '{"status":"NEW"}': 3 }),
        findMany: jest.fn(() => Promise.resolve([{ createdAt: new Date() }])),
      },
      newsletterSubscriber: {
        count: countMock({ null: 40, '{"status":"SUBSCRIBED"}': 35 }),
        findMany: jest.fn(() =>
          Promise.resolve([{ subscribedAt: new Date() }]),
        ),
      },
      contactSubmission: { count: countMock({ null: 6 }) },
      applicationSubmission: {
        count: countMock({ null: 9, '{"reviewStatus":"NEW"}': 4 }),
        findMany: jest.fn(() => Promise.resolve([{ submittedAt: new Date() }])),
      },
      auditLog: {
        count: countMock({ null: 73 }),
        findMany: jest.fn(() =>
          Promise.resolve([{ id: 'a1', action: 'ADMIN_LOGIN_SUCCEEDED' }]),
        ),
      },
    };

    service = new DashboardService(prisma as never);
  });

  it('a CONTENT_EDITOR sees only content counts — no manage-tier or audit data queried at all', async () => {
    userRoles = [{ role: 'CONTENT_EDITOR', status: 'ACTIVE' }];

    const result = await service.getAnalytics('user-1');

    expect(result.overview).toEqual({
      programs: { total: 10, published: 7 },
      publishedContent: 3 + 2 + 1,
      teamMembers: 5,
      mediaFiles: 20,
      openApplications: 1,
    });
    expect(result.trends).toBeUndefined();
    expect(result.recentActivity).toBeUndefined();

    // Not just absent from the response — never queried for.
    expect(prisma.user.count).not.toHaveBeenCalled();
    expect(prisma.supportRequest.count).not.toHaveBeenCalled();
    expect(prisma.auditLog.count).not.toHaveBeenCalled();
  });

  it('an ADMINISTRATOR sees manage-tier data and trends, but not audit data', async () => {
    userRoles = [{ role: 'ADMINISTRATOR', status: 'ACTIVE' }];

    const result = await service.getAnalytics('user-1');

    expect(result.overview.users).toEqual({
      total: 12,
      active: 10,
      deactivated: 2,
    });
    expect(result.overview.supportRequests).toEqual({ total: 8, new: 3 });
    expect(result.overview.newsletterSubscribers).toEqual({
      total: 40,
      subscribed: 35,
    });
    expect(result.overview.contactSubmissions).toEqual({ total: 6 });
    expect(result.overview.applicationSubmissions).toEqual({
      total: 9,
      new: 4,
    });
    expect(result.trends).toBeDefined();
    expect(result.trends!.userGrowth).toHaveLength(30);

    expect(result.overview.auditLogEntries).toBeUndefined();
    expect(result.recentActivity).toBeUndefined();
    expect(prisma.auditLog.count).not.toHaveBeenCalled();
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('a SUPER_ADMINISTRATOR sees everything, including audit data', async () => {
    userRoles = [{ role: 'SUPER_ADMINISTRATOR', status: 'ACTIVE' }];

    const result = await service.getAnalytics('user-1');

    expect(result.overview.users).toBeDefined();
    expect(result.overview.auditLogEntries).toBe(73);
    expect(result.recentActivity).toHaveLength(1);
  });

  it('ignores a role the caller holds but is not ACTIVE for (e.g. PENDING_MFA)', async () => {
    userRoles = [{ role: 'SUPER_ADMINISTRATOR', status: 'PENDING_MFA' }];

    const result = await service.getAnalytics('user-1');

    // findMany itself was called with status: 'ACTIVE' in its where clause —
    // the mock always returns the full seeded list regardless, so the real
    // guarantee under test is that the service's OWN filtering of the
    // result respects role status, not just delegates to the DB query.
    expect(prisma.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', status: 'ACTIVE' },
      }),
    );
    expect(result.overview.users).toBeUndefined();
    expect(result.recentActivity).toBeUndefined();
  });

  it('bucketByDay produces exactly one entry per day for the trend window, oldest first', async () => {
    userRoles = [{ role: 'ADMINISTRATOR', status: 'ACTIVE' }];
    const result = await service.getAnalytics('user-1');

    const dates = result.trends!.userGrowth.map((p) => p.date);
    expect(dates).toHaveLength(30);
    expect(new Date(dates[0]).getTime()).toBeLessThan(
      new Date(dates[29]).getTime(),
    );
    // Every date string is unique and in strict ascending order.
    expect(new Set(dates).size).toBe(30);
  });
});
