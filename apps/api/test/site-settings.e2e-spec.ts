import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Site Settings (e2e)', () => {
  const runId = Date.now();
  const prefix = `settings-e2e-${runId}`;
  const password = 'SettingsE2ePassw0rd!!';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let originalSettings: { tagline: string | null } | null;

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
    // This module writes to the real singleton row (there's only one) —
    // capture whatever's there beforehand so it can be restored, rather
    // than clobbering real settings another test/run may depend on.
    originalSettings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
    });
  });

  afterAll(async () => {
    if (originalSettings) {
      await prisma.siteSettings.update({
        where: { id: 'singleton' },
        data: { tagline: originalSettings.tagline },
      });
    }
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'SiteSettings',
        entityId: 'singleton',
        actorId: { not: null },
      },
    });
    await prisma.userRole.deleteMany({
      where: { user: { email: { startsWith: prefix } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  async function createUser(role?: 'CONTENT_EDITOR' | 'ADMINISTRATOR') {
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

  it('requires authentication to update', async () => {
    await request(app.getHttpServer())
      .patch('/site-settings')
      .send({ tagline: `${prefix}-tagline` })
      .expect(401);
  });

  it('requires ADMINISTRATOR or higher, not just CONTENT_EDITOR', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    await request(app.getHttpServer())
      .patch('/site-settings')
      .set('Cookie', await login(editor.email))
      .send({ tagline: `${prefix}-tagline` })
      .expect(403);
  });

  it('rejects invalid values', async () => {
    const admin = await createUser('ADMINISTRATOR');
    const adminCookie = await login(admin.email);

    await request(app.getHttpServer())
      .patch('/site-settings')
      .set('Cookie', adminCookie)
      .send({ contactEmail: 'not-an-email' })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/site-settings')
      .set('Cookie', adminCookie)
      .send({ tcmTvUrl: 'not-a-url' })
      .expect(400);
  });

  it('updates as ADMINISTRATOR, persists, applies partial PATCH, and returns the full shape', async () => {
    const admin = await createUser('ADMINISTRATOR');
    const adminCookie = await login(admin.email);

    const first = await request(app.getHttpServer())
      .patch('/site-settings')
      .set('Cookie', adminCookie)
      .send({ tagline: `${prefix}-tagline`, contactEmail: 'hello@example.com' })
      .expect(200);
    expect(first.body).toMatchObject({
      tagline: `${prefix}-tagline`,
      contactEmail: 'hello@example.com',
    });
    // Response shape includes every public SiteSettings field, not just the
    // ones this request touched.
    expect(first.body).toHaveProperty('navigation');
    expect(first.body).toHaveProperty('tcmTvUrl');
    expect(first.body).toHaveProperty('donateUrl');

    // Partial PATCH: updating only contactPhone must not disturb the
    // tagline/contactEmail set in the previous request.
    const second = await request(app.getHttpServer())
      .patch('/site-settings')
      .set('Cookie', adminCookie)
      .send({ contactPhone: '+2348000000000' })
      .expect(200);
    expect(second.body).toMatchObject({
      tagline: `${prefix}-tagline`,
      contactEmail: 'hello@example.com',
      contactPhone: '+2348000000000',
    });

    // Persistence: a fresh public read reflects the update.
    const publicRead = await request(app.getHttpServer())
      .get('/site-settings')
      .expect(200);
    expect(publicRead.body).toMatchObject({ tagline: `${prefix}-tagline` });

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        entityType: 'SiteSettings',
        entityId: 'singleton',
        actorId: admin.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditEntry).toBeTruthy();
    expect(auditEntry?.action).toBe('CONTENT_UPDATED');
  });

  it('SUPER_ADMINISTRATOR can also update (ADMINISTRATOR+ tier)', async () => {
    const superAdmin = await createUser();
    await prisma.userRole.create({
      data: {
        userId: superAdmin.id,
        role: 'SUPER_ADMINISTRATOR',
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    await request(app.getHttpServer())
      .patch('/site-settings')
      .set('Cookie', await login(superAdmin.email))
      .send({ tagline: `${prefix}-super-admin-tagline` })
      .expect(200);
  });
});
