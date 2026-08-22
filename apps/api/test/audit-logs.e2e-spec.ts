import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Audit log read API (e2e)', () => {
  const runId = Date.now();
  const prefix = `audit-e2e-${runId}`;
  const password = 'AuditE2ePassw0rd!!';
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({
      where: { user: { email: { startsWith: prefix } } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { startsWith: prefix } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  async function createUser(
    role?: 'CONTENT_EDITOR' | 'ADMINISTRATOR' | 'SUPER_ADMINISTRATOR',
  ) {
    const user = await prisma.user.create({
      data: {
        email: `${prefix}-${Math.random()}@test.local`,
        passwordHash: await argon2.hash(password),
      },
    });
    if (role) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          role,
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });
    }
    return user;
  }

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const cookies = response.headers['set-cookie'] as unknown as
      string[] | undefined;
    if (!cookies) throw new Error('Expected session cookies');
    return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
  }

  it('rejects an unauthenticated request with 401', async () => {
    await request(app.getHttpServer()).get('/audit-logs').expect(401);
  });

  it('rejects an authenticated user without SUPER_ADMINISTRATOR with 403', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Cookie', await login(editor.email))
      .expect(403);

    // ADMINISTRATOR is also insufficient — this endpoint is intentionally
    // scoped to SUPER_ADMINISTRATOR only, same tier as role assign/revoke.
    const admin = await createUser('ADMINISTRATOR');
    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Cookie', await login(admin.email))
      .expect(403);
  });

  it('lets an authorized SUPER_ADMINISTRATOR retrieve logs, paginate, filter, and never exposes secrets', async () => {
    const superAdmin = await createUser('SUPER_ADMINISTRATOR');
    const superCookie = await login(superAdmin.email);
    // Login itself just recorded an ADMIN_LOGIN_SUCCEEDED entry for this actor.

    const target = await createUser();
    const assigned = await request(app.getHttpServer())
      .post('/roles/assign')
      .set('Cookie', superCookie)
      .send({ userId: target.id, role: 'CONTENT_EDITOR' })
      .expect(200);
    const roleId = (assigned.body as { id: string }).id;

    // Basic retrieval + response shape.
    const list = await request(app.getHttpServer())
      .get(`/audit-logs?actorId=${superAdmin.id}&take=50`)
      .set('Cookie', superCookie)
      .expect(200);
    const body = list.body as {
      items: Array<Record<string, unknown>>;
      total: number;
      skip: number;
      take: number;
    };
    expect(body).toEqual(expect.objectContaining({ skip: 0, take: 50 }));
    expect(body.total).toBeGreaterThanOrEqual(2); // login + role assignment
    expect(Array.isArray(body.items)).toBe(true);

    // Newest first.
    const timestamps = body.items.map((entry) =>
      new Date(entry.createdAt as string).getTime(),
    );
    const sorted = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sorted);

    // No secrets anywhere in the payload, for this actor or the nested
    // actor relation.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/passwordHash/i);
    expect(serialized).not.toMatch(/mfaSecretEncrypted/i);
    expect(serialized).not.toMatch(/refreshToken/i);
    expect(serialized).not.toContain(password);

    const roleAssignedEntry = body.items.find(
      (entry) => entry.action === 'ROLE_ASSIGNED' && entry.entityId === roleId,
    );
    expect(roleAssignedEntry).toBeDefined();
    expect(roleAssignedEntry).toEqual(
      expect.objectContaining({
        entityType: 'UserRole',
        actor: { id: superAdmin.id, email: superAdmin.email },
      }),
    );

    // Filtering by action.
    const filteredByAction = await request(app.getHttpServer())
      .get(`/audit-logs?actorId=${superAdmin.id}&action=ROLE_ASSIGNED`)
      .set('Cookie', superCookie)
      .expect(200);
    const filteredActionBody = filteredByAction.body as {
      items: Array<Record<string, unknown>>;
    };
    expect(filteredActionBody.items.length).toBeGreaterThanOrEqual(1);
    expect(
      filteredActionBody.items.every(
        (entry) => entry.action === 'ROLE_ASSIGNED',
      ),
    ).toBe(true);

    // Filtering by entityType.
    const filteredByEntity = await request(app.getHttpServer())
      .get(`/audit-logs?actorId=${superAdmin.id}&entityType=UserRole`)
      .set('Cookie', superCookie)
      .expect(200);
    const filteredEntityBody = filteredByEntity.body as {
      items: Array<Record<string, unknown>>;
    };
    expect(
      filteredEntityBody.items.every(
        (entry) => entry.entityType === 'UserRole',
      ),
    ).toBe(true);

    // Pagination: skip=1,take=1 returns the second item from the unpaginated list.
    const paged = await request(app.getHttpServer())
      .get(`/audit-logs?actorId=${superAdmin.id}&take=1&skip=1`)
      .set('Cookie', superCookie)
      .expect(200);
    const pagedBody = paged.body as { items: Array<{ id: string }> };
    expect(pagedBody.items).toHaveLength(1);
    expect(pagedBody.items[0].id).toBe(body.items[1].id);

    // Rejects an unknown action value with 400, not a silent no-op.
    await request(app.getHttpServer())
      .get('/audit-logs?action=NOT_A_REAL_ACTION')
      .set('Cookie', superCookie)
      .expect(400);

    // GET /audit-logs/:id
    await request(app.getHttpServer())
      .get(`/audit-logs/${roleAssignedEntry!.id as string}`)
      .set('Cookie', superCookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/audit-logs/does-not-exist')
      .set('Cookie', superCookie)
      .expect(404);
  });

  it('does not create an audit entry merely for reading the audit log', async () => {
    const superAdmin = await createUser('SUPER_ADMINISTRATOR');
    const superCookie = await login(superAdmin.email);

    const before = await request(app.getHttpServer())
      .get(`/audit-logs?actorId=${superAdmin.id}`)
      .set('Cookie', superCookie)
      .expect(200);
    const beforeTotal = (before.body as { total: number }).total;

    await request(app.getHttpServer())
      .get(`/audit-logs?actorId=${superAdmin.id}`)
      .set('Cookie', superCookie)
      .expect(200);
    const after = await request(app.getHttpServer())
      .get(`/audit-logs?actorId=${superAdmin.id}`)
      .set('Cookie', superCookie)
      .expect(200);
    const afterTotal = (after.body as { total: number }).total;

    expect(afterTotal).toBe(beforeTotal);
  });
});
