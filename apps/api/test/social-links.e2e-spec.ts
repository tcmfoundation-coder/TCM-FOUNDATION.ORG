import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Social Links management (e2e)', () => {
  const runId = Date.now();
  const prefix = `social-link-e2e-${runId}`;
  const password = 'SocialLinksE2ePassw0rd!!';
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
    const links = await prisma.socialLink.findMany({
      where: { url: { contains: prefix } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'SocialLink',
        entityId: { in: links.map((l) => l.id) },
      },
    });
    await prisma.socialLink.deleteMany({
      where: { url: { contains: prefix } },
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

  it('enforces unauthenticated and unauthorized create attempts', async () => {
    const payload = {
      platform: 'instagram',
      url: `https://instagram.com/${prefix}-unauth`,
    };
    await request(app.getHttpServer())
      .post('/social-links')
      .send(payload)
      .expect(401);

    const unprivileged = await createUser();
    await request(app.getHttpServer())
      .post('/social-links')
      .set('Cookie', await login(unprivileged.email))
      .send(payload)
      .expect(403);
  });

  it('rejects an invalid platform and an invalid URL', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);

    await request(app.getHttpServer())
      .post('/social-links')
      .set('Cookie', editorCookie)
      .send({ platform: 'myspace', url: `https://myspace.com/${prefix}` })
      .expect(400);

    await request(app.getHttpServer())
      .post('/social-links')
      .set('Cookie', editorCookie)
      .send({ platform: 'instagram', url: 'not-a-url' })
      .expect(400);
  });

  it('validates, creates, reads, updates, audits, and deletes a social link', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);
    const url = `https://instagram.com/${prefix}-managed`;

    const created = await request(app.getHttpServer())
      .post('/social-links')
      .set('Cookie', editorCookie)
      .send({ platform: 'instagram', url })
      .expect(201);
    const id = (created.body as Record<string, unknown>).id as string;
    expect((created.body as Record<string, unknown>).isActive).toBe(true);

    await request(app.getHttpServer())
      .get(`/social-links/id/${id}`)
      .set('Cookie', editorCookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/social-links/id/missing')
      .set('Cookie', editorCookie)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/social-links/${id}`)
      .set('Cookie', editorCookie)
      .send({ isActive: false })
      .expect(200);

    const publicListAfterDeactivate = await request(app.getHttpServer())
      .get('/social-links')
      .expect(200);
    const activeUrls = (
      publicListAfterDeactivate.body as { url: string }[]
    ).map((l) => l.url);
    expect(activeUrls).not.toContain(url);

    await request(app.getHttpServer())
      .patch(`/social-links/${id}`)
      .set('Cookie', editorCookie)
      .send({ isActive: true })
      .expect(200);

    const publicListAfterReactivate = await request(app.getHttpServer())
      .get('/social-links')
      .expect(200);
    expect(
      (publicListAfterReactivate.body as { url: string }[]).map((l) => l.url),
    ).toContain(url);

    const auditCount = await prisma.auditLog.count({
      where: { entityType: 'SocialLink', entityId: id, actorId: editor.id },
    });
    expect(auditCount).toBeGreaterThanOrEqual(3);

    const unprivileged = await createUser();
    await request(app.getHttpServer())
      .delete(`/social-links/${id}`)
      .set('Cookie', await login(unprivileged.email))
      .expect(403);

    const admin = await createUser('ADMINISTRATOR');
    await request(app.getHttpServer())
      .delete(`/social-links/${id}`)
      .set('Cookie', await login(admin.email))
      .expect(204);

    const deletionAuditCount = await prisma.auditLog.count({
      where: {
        entityType: 'SocialLink',
        entityId: id,
        action: 'CONTENT_DELETED',
      },
    });
    expect(deletionAuditCount).toBe(1);
  });

  it('admin list includes inactive links; public list only shows active ones', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);

    const active = await request(app.getHttpServer())
      .post('/social-links')
      .set('Cookie', editorCookie)
      .send({
        platform: 'linkedin',
        url: `https://linkedin.com/company/${prefix}-active`,
      })
      .expect(201);
    const inactive = await request(app.getHttpServer())
      .post('/social-links')
      .set('Cookie', editorCookie)
      .send({
        platform: 'facebook',
        url: `https://facebook.com/${prefix}-inactive`,
        isActive: false,
      })
      .expect(201);

    const publicList = await request(app.getHttpServer())
      .get('/social-links')
      .expect(200);
    const publicUrls = (publicList.body as { url: string }[]).map((l) => l.url);
    expect(publicUrls).toContain((active.body as Record<string, unknown>).url);
    expect(publicUrls).not.toContain(
      (inactive.body as Record<string, unknown>).url,
    );

    const adminList = await request(app.getHttpServer())
      .get('/social-links/admin')
      .set('Cookie', editorCookie)
      .expect(200);
    const adminUrls = (adminList.body as { url: string }[]).map((l) => l.url);
    expect(adminUrls).toContain((active.body as Record<string, unknown>).url);
    expect(adminUrls).toContain((inactive.body as Record<string, unknown>).url);
  });
});
