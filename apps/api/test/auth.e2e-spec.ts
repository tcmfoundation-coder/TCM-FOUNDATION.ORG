import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { generate, generateSecret } from 'otplib';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MfaService } from '../src/modules/identity/auth/mfa.service';

/**
 * Covers the Phase 2 auth/authorization contract end-to-end against a real
 * database (no mocks) — role activation gated behind TOTP MFA enrollment,
 * DB-fresh authorization (not JWT-embedded roles), and refresh-token
 * rotation with reuse detection. Test fixtures are created directly via
 * PrismaService rather than depending on the SEED_SUPER_ADMIN_* bootstrap
 * (which only runs once and shouldn't gate whether these tests can run).
 */
describe('Auth + Roles (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    await app.close();
  });

  async function createUserWithRole(
    email: string,
    password: string,
    role: 'ADMINISTRATOR' | 'SUPER_ADMINISTRATOR',
  ) {
    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    await prisma.userRole.create({
      data: { userId: user.id, role, status: 'PENDING_MFA' },
    });
    return user;
  }

  type SetCookieHeader = string | string[] | undefined;

  function normalizeSetCookie(header: SetCookieHeader): string[] {
    if (!header) return [];
    return Array.isArray(header) ? header : [header];
  }

  function extractCookie(
    setCookieHeader: SetCookieHeader,
    name: string,
  ): string {
    const line = normalizeSetCookie(setCookieHeader).find((c) =>
      c.startsWith(`${name}=`),
    );
    if (!line) throw new Error(`Cookie ${name} not found in response`);
    return line.split(';')[0];
  }

  function cookieJar(): Record<string, string> {
    return {};
  }

  function applyCookies(
    jar: Record<string, string>,
    setCookieHeader: SetCookieHeader,
  ) {
    for (const line of normalizeSetCookie(setCookieHeader)) {
      const pair = line.split(';')[0];
      const idx = pair.indexOf('=');
      jar[pair.slice(0, idx)] = pair;
    }
  }

  function cookieHeader(jar: Record<string, string>): string {
    return Object.values(jar).join('; ');
  }

  interface LoginResponseBody {
    mfaRequired: boolean;
  }
  interface RolesMeResponseBody {
    mfaEnabled: boolean;
    roles: { role: string; status: string }[];
  }
  interface MfaSetupResponseBody {
    secret: string;
  }
  interface MfaEnrollVerifyResponseBody {
    activatedRoles: string[];
  }
  interface CreateUserResponseBody {
    id: string;
  }

  function body<T>(res: request.Response): T {
    return res.body as T;
  }

  it('gates role activation behind TOTP MFA enrollment, then allows the privileged endpoint', async () => {
    const email = `e2e-admin-${runId}@test.local`;
    const password = 'E2eAdminPassw0rd!!';
    await createUserWithRole(email, password, 'SUPER_ADMINISTRATOR');

    const jar = cookieJar();
    const http = request(app.getHttpServer());

    let res = await http.post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(body<LoginResponseBody>(res).mfaRequired).toBe(false);
    applyCookies(jar, res.headers['set-cookie']);

    res = await http.get('/roles/me').set('Cookie', cookieHeader(jar));
    expect(res.status).toBe(200);
    expect(
      body<RolesMeResponseBody>(res).roles.find(
        (r) => r.role === 'SUPER_ADMINISTRATOR',
      )?.status,
    ).toBe('PENDING_MFA');

    // Privileged endpoint rejected while the role is only PENDING_MFA.
    res = await http.get('/users').set('Cookie', cookieHeader(jar));
    expect(res.status).toBe(403);

    res = await http.post('/roles/mfa/setup').set('Cookie', cookieHeader(jar));
    expect(res.status).toBe(200);
    const secret = body<MfaSetupResponseBody>(res).secret;
    expect(secret).toBeTruthy();

    const code = await generate({ secret });
    res = await http
      .post('/roles/mfa/enroll-verify')
      .set('Cookie', cookieHeader(jar))
      .send({ code });
    expect(res.status).toBe(200);
    expect(body<MfaEnrollVerifyResponseBody>(res).activatedRoles).toContain(
      'SUPER_ADMINISTRATOR',
    );

    res = await http.get('/roles/me').set('Cookie', cookieHeader(jar));
    expect(body<RolesMeResponseBody>(res).mfaEnabled).toBe(true);
    expect(
      body<RolesMeResponseBody>(res).roles.find(
        (r) => r.role === 'SUPER_ADMINISTRATOR',
      )?.status,
    ).toBe('ACTIVE');

    // Now allowed.
    res = await http.get('/users').set('Cookie', cookieHeader(jar));
    expect(res.status).toBe(200);
  });

  it('staff provisioning: Super Admin creates a user, who is blocked until they complete MFA themselves', async () => {
    const adminEmail = `e2e-admin2-${runId}@test.local`;
    const adminPassword = 'E2eAdminPassw0rd!!';
    const admin = await createUserWithRole(
      adminEmail,
      adminPassword,
      'SUPER_ADMINISTRATOR',
    );
    const adminSecret = generateSecret(); // enrolled directly below, bypassing the setup HTTP call
    const mfaService = app.get(MfaService);
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        mfaEnabled: true,
        mfaSecretEncrypted: mfaService.encryptSecret(adminSecret),
      },
    });
    await prisma.userRole.updateMany({
      where: { userId: admin.id },
      data: { status: 'ACTIVE', activatedAt: new Date() },
    });

    const http = request(app.getHttpServer());
    const adminJar = cookieJar();

    let res = await http
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    expect(body<LoginResponseBody>(res).mfaRequired).toBe(true); // already enrolled -> must re-verify every login
    applyCookies(adminJar, res.headers['set-cookie']);

    const adminCode = await generate({ secret: adminSecret });
    res = await http
      .post('/auth/mfa/login-verify')
      .set('Cookie', cookieHeader(adminJar))
      .send({ code: adminCode });
    expect(res.status).toBe(200);
    applyCookies(adminJar, res.headers['set-cookie']);

    const staffEmail = `e2e-staff-${runId}@test.local`;
    res = await http.post('/users').set('Cookie', cookieHeader(adminJar)).send({
      email: staffEmail,
      temporaryPassword: 'StaffPassw0rd!!',
      initialRole: 'ADMINISTRATOR',
    });
    expect([200, 201]).toContain(res.status);
    const staffId = body<CreateUserResponseBody>(res).id;

    const staffJar = cookieJar();
    res = await http
      .post('/auth/login')
      .send({ email: staffEmail, password: 'StaffPassw0rd!!' });
    expect(body<LoginResponseBody>(res).mfaRequired).toBe(false); // not enrolled yet
    applyCookies(staffJar, res.headers['set-cookie']);

    res = await http.get('/users').set('Cookie', cookieHeader(staffJar));
    expect(res.status).toBe(403); // ADMINISTRATOR role still PENDING_MFA

    res = await http
      .post('/roles/mfa/setup')
      .set('Cookie', cookieHeader(staffJar));
    const staffSecret = body<MfaSetupResponseBody>(res).secret;
    const staffCode = await generate({ secret: staffSecret });
    res = await http
      .post('/roles/mfa/enroll-verify')
      .set('Cookie', cookieHeader(staffJar))
      .send({ code: staffCode });
    expect(res.status).toBe(200);

    res = await http.get('/users').set('Cookie', cookieHeader(staffJar));
    expect(res.status).toBe(200); // ADMINISTRATOR role now ACTIVE

    // Revoking the role denies access on the very next request — no
    // waiting for the (still valid) access token to expire.
    res = await http
      .post('/roles/revoke')
      .set('Cookie', cookieHeader(adminJar))
      .send({ userId: staffId, role: 'ADMINISTRATOR' });
    expect(res.status).toBe(200);

    res = await http.get('/users').set('Cookie', cookieHeader(staffJar));
    expect(res.status).toBe(403);
  });

  it('refresh token rotates and rejects reuse of an already-rotated token', async () => {
    const email = `e2e-refresh-${runId}@test.local`;
    const password = 'E2eRefreshPassw0rd!!';
    await createUserWithRole(email, password, 'ADMINISTRATOR');

    const http = request(app.getHttpServer());
    const loginRes = await http.post('/auth/login').send({ email, password });
    const originalRefresh = extractCookie(
      loginRes.headers['set-cookie'],
      'refresh_token',
    );

    const firstRefresh = await http
      .post('/auth/refresh')
      .set('Cookie', originalRefresh);
    expect(firstRefresh.status).toBe(200);

    // Reusing the token that was already rotated out must be rejected.
    const replay = await http
      .post('/auth/refresh')
      .set('Cookie', originalRefresh);
    expect(replay.status).toBe(401);
  });
});
