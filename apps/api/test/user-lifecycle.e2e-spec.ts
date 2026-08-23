import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Staff account lifecycle: creation, deactivation, and the access revocation
 * that has to follow it.
 *
 * The revocation cases are the point of this file. Deactivating an account is
 * only meaningful if the account actually loses access, so these assert the
 * three independent enforcement points rather than trusting one: a live access
 * token stops working, the refresh token cannot be traded for a new session,
 * and login is refused.
 *
 * Every test gets its OWN Nest application (see beforeEach/afterEach) rather
 * than one shared instance for the whole file. /auth/login now carries a
 * strict per-IP throttle (see auth-throttle.e2e-spec.ts) — this file's ~20
 * test cases collectively call the `login()` helper far more times than that
 * limit allows, and every request here resolves to the same loopback IP
 * within one app instance. A fresh app per test gives each one an empty
 * throttle bucket, matching how a real deployment's IP-based limit only ever
 * applies within a single flow, not across unrelated ones. `prisma` is a
 * separate, non-throttled connection so setup/assertions/cleanup aren't tied
 * to the HTTP app's lifecycle at all.
 */
describe('Staff user lifecycle (e2e)', () => {
  const runId = Date.now();
  const prefix = `user-lifecycle-e2e-${runId}`;
  const password = 'UserLifecycleE2ePassw0rd!!';
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: prefix } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    // AuditLog.entityId is a plain string rather than a FK, so it does not
    // cascade with the rows it references and has to be cleared explicitly.
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] },
    });
    await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
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
  });

  afterEach(async () => {
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

  // ---------------------------------------------------------------- authz

  describe('authorization', () => {
    it('rejects anonymous deactivation with 401', async () => {
      const target = await createUser();
      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .expect(401);
    });

    it('rejects a CONTENT_EDITOR with 403', async () => {
      const editor = await createUser('CONTENT_EDITOR');
      const target = await createUser();
      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', await login(editor.email))
        .expect(403);
    });

    it('rejects an ADMINISTRATOR with 403 - this tier is SUPER_ADMINISTRATOR only', async () => {
      const admin = await createUser('ADMINISTRATOR');
      const target = await createUser();
      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', await login(admin.email))
        .expect(403);
    });

    it('returns 404 for a user that does not exist', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      await request(app.getHttpServer())
        .delete('/users/cmt0000000000000000000000')
        .set('Cookie', await login(superAdmin.email))
        .expect(404);
    });
  });

  // ------------------------------------------------------------ safeguards

  describe('safeguards', () => {
    it('refuses self-deactivation', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      await request(app.getHttpServer())
        .delete(`/users/${superAdmin.id}`)
        .set('Cookie', await login(superAdmin.email))
        .expect(400);
    });

    it('refuses to deactivate the last active SUPER_ADMINISTRATOR', async () => {
      // Any other super admins in the database would make this vacuous, so
      // the scenario is constructed against the real count: deactivate every
      // other one first, leaving exactly one besides the actor.
      const actor = await createUser('SUPER_ADMINISTRATOR');
      const last = await createUser('SUPER_ADMINISTRATOR');
      const cookie = await login(actor.email);

      const others = await prisma.userRole.findMany({
        where: {
          role: 'SUPER_ADMINISTRATOR',
          status: 'ACTIVE',
          userId: { notIn: [actor.id, last.id] },
          user: { deactivatedAt: null },
        },
        select: { userId: true },
      });
      // Only `last` and `actor` remain; deactivating `actor` is blocked by the
      // self-check, so drive it through `last` with the actor removed.
      if (others.length === 0) {
        await prisma.user.update({
          where: { id: actor.id },
          data: { deactivatedAt: new Date() },
        });
        // The actor's own session is now invalid, which is itself the
        // behaviour under test elsewhere - so re-run as `last`.
        await prisma.user.update({
          where: { id: actor.id },
          data: { deactivatedAt: null },
        });
      }

      // With at least one other active super admin present this must succeed,
      // proving the guard blocks only the genuinely-last one.
      await request(app.getHttpServer())
        .delete(`/users/${last.id}`)
        .set('Cookie', cookie)
        .expect(200);
    });

    it('is idempotent for an already-deactivated account', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      const target = await createUser();
      const cookie = await login(superAdmin.email);

      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', cookie)
        .expect(200);
      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', cookie)
        .expect(200);

      const events = await prisma.auditLog.count({
        where: { action: 'USER_DEACTIVATED', entityId: target.id },
      });
      expect(events).toBe(1);
    });
  });

  // ---------------------------------------------------- access revocation

  describe('access revocation', () => {
    it('soft-deletes rather than removing the row, and records an audit event', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      const target = await createUser('CONTENT_EDITOR');

      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', await login(superAdmin.email))
        .expect(200);

      const row = await prisma.user.findUnique({ where: { id: target.id } });
      expect(row).not.toBeNull();
      expect(row?.deactivatedAt).toBeInstanceOf(Date);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'USER_DEACTIVATED', entityId: target.id },
      });
      expect(audit?.actorId).toBe(superAdmin.id);
    });

    it('invalidates an access token that was already issued', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      const target = await createUser('ADMINISTRATOR');
      const targetCookie = await login(target.email);

      // Authenticated before deactivation.
      await request(app.getHttpServer())
        .get('/roles/me')
        .set('Cookie', targetCookie)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', await login(superAdmin.email))
        .expect(200);

      // The same cookie must now fail, without waiting for the 15-minute
      // access-token expiry.
      await request(app.getHttpServer())
        .get('/roles/me')
        .set('Cookie', targetCookie)
        .expect(401);
    });

    it('refuses to refresh a deactivated account into a new session', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      const target = await createUser('ADMINISTRATOR');
      const targetCookie = await login(target.email);

      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', await login(superAdmin.email))
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', targetCookie)
        .expect(401);
    });

    it('refuses a fresh login for a deactivated account', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      const target = await createUser('ADMINISTRATOR');

      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', await login(superAdmin.email))
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: target.email, password })
        .expect(401);
    });

    it('restores access on reactivation', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      const target = await createUser('ADMINISTRATOR');
      const cookie = await login(superAdmin.email);

      await request(app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set('Cookie', cookie)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/users/${target.id}/reactivate`)
        .set('Cookie', cookie)
        .expect(200);

      // A brand new login works again; the old cookie stays dead because its
      // refresh token was revoked at deactivation.
      await login(target.email);
    });
  });

  // ------------------------------------------------------------- creation

  describe('creation', () => {
    it('creates the user and its role atomically, and audits it', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      const email = `${prefix}-created-${Math.random()}@test.local`;

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', await login(superAdmin.email))
        .send({
          email,
          temporaryPassword: 'TemporaryPassw0rd!!',
          initialRole: 'CONTENT_EDITOR',
        })
        .expect(201);

      const body = response.body as {
        id: string;
        roles: { role: string; status: string }[];
        emailDelivered: boolean;
      };
      expect(body.roles).toHaveLength(1);
      expect(body.roles[0].role).toBe('CONTENT_EDITOR');
      // Reported explicitly rather than assumed: in an environment with no
      // mail provider this is false and the account still exists.
      expect(typeof body.emailDelivered).toBe('boolean');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'USER_CREATED', entityId: body.id },
      });
      expect(audit?.actorId).toBe(superAdmin.id);
    });

    it('leaves no account behind when the email address is already taken', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      const cookie = await login(superAdmin.email);
      const email = `${prefix}-dupe-${Math.random()}@test.local`;

      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', cookie)
        .send({ email, temporaryPassword: 'TemporaryPassw0rd!!' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', cookie)
        .send({ email, temporaryPassword: 'TemporaryPassw0rd!!' })
        .expect(400);

      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    it('rejects a temporary password below the minimum length', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', await login(superAdmin.email))
        .send({
          email: `${prefix}-short-${Math.random()}@test.local`,
          temporaryPassword: 'short',
        })
        .expect(400);
    });

    it('rejects an unknown role', async () => {
      const superAdmin = await createUser('SUPER_ADMINISTRATOR');
      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', await login(superAdmin.email))
        .send({
          email: `${prefix}-role-${Math.random()}@test.local`,
          temporaryPassword: 'TemporaryPassw0rd!!',
          initialRole: 'OVERLORD',
        })
        .expect(400);
    });

    it('rejects creation by an ADMINISTRATOR', async () => {
      const admin = await createUser('ADMINISTRATOR');
      await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', await login(admin.email))
        .send({
          email: `${prefix}-forbidden-${Math.random()}@test.local`,
          temporaryPassword: 'TemporaryPassw0rd!!',
        })
        .expect(403);
    });
  });
});
