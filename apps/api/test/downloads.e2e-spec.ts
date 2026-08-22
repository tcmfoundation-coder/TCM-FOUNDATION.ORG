import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Downloadable Resources management (e2e)', () => {
  const runId = Date.now();
  const prefix = `download-e2e-${runId}`;
  const password = 'DownloadsE2ePassw0rd!!';
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
    const downloads = await prisma.download.findMany({
      where: { slug: { startsWith: prefix } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'Download',
        entityId: { in: downloads.map((d) => d.id) },
      },
    });
    await prisma.download.deleteMany({
      where: { slug: { startsWith: prefix } },
    });
    await prisma.media.deleteMany({
      where: { cloudinaryPublicId: { startsWith: prefix } },
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

  // Downloads reference an already-uploaded Media row (POST /media/upload is
  // the real Cloudinary integration, covered separately by
  // media.service.spec.ts, including the Cloudinary-failure path). Creating
  // the fixture row directly here mirrors what a successful upload leaves
  // behind, without re-exercising Cloudinary in this suite.
  async function createFileMedia() {
    return prisma.media.create({
      data: {
        cloudinaryPublicId: `${prefix}-${Math.random()}`,
        secureUrl: 'https://res.cloudinary.com/test/raw/upload/fixture.pdf',
        type: 'DOCUMENT',
        altText: 'Fixture document',
      },
    });
  }

  it('enforces unauthenticated and unauthorized create attempts', async () => {
    const media = await createFileMedia();
    const payload = {
      slug: `${prefix}-unauth`,
      title: 'Title',
      fileId: media.id,
    };
    await request(app.getHttpServer())
      .post('/downloads')
      .send(payload)
      .expect(401);

    const unprivileged = await createUser();
    await request(app.getHttpServer())
      .post('/downloads')
      .set('Cookie', await login(unprivileged.email))
      .send(payload)
      .expect(403);
  });

  it('rejects invalid input and a nonexistent file reference', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);

    await request(app.getHttpServer())
      .post('/downloads')
      .set('Cookie', editorCookie)
      .send({
        slug: `${prefix}-invalid`,
        title: '',
        fileId: 'cabcdefghijklmnopqrstuvwx',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/downloads')
      .set('Cookie', editorCookie)
      .send({
        slug: `${prefix}-missing-file`,
        title: 'Missing File',
        fileId: 'cabcdefghijklmnopqrstuvwx',
      })
      .expect(400);
  });

  it('validates, creates, reads, updates, publishes, audits, and deletes a download', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);
    const media = await createFileMedia();
    const replacementMedia = await createFileMedia();
    const slug = `${prefix}-managed`;

    const created = await request(app.getHttpServer())
      .post('/downloads')
      .set('Cookie', editorCookie)
      .send({
        slug,
        title: 'Managed Resource',
        description: 'Description',
        fileId: media.id,
      })
      .expect(201);
    const id = (created.body as Record<string, unknown>).id as string;
    expect((created.body as Record<string, unknown>).isPublished).toBe(true);

    await request(app.getHttpServer())
      .post('/downloads')
      .set('Cookie', editorCookie)
      .send({ slug, title: 'Duplicate', fileId: media.id })
      .expect(409);

    await request(app.getHttpServer())
      .get(`/downloads/id/${id}`)
      .set('Cookie', editorCookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/downloads/id/missing')
      .set('Cookie', editorCookie)
      .expect(404);

    // Published by default: the public endpoint should already serve it,
    // with the file's secureUrl included so the frontend can render a real
    // download link.
    const publicBeforeUnpublish = await request(app.getHttpServer())
      .get(`/downloads/${slug}`)
      .expect(200);
    expect(
      (publicBeforeUnpublish.body as { file: { secureUrl: string } }).file
        .secureUrl,
    ).toBe(media.secureUrl);

    await request(app.getHttpServer())
      .patch(`/downloads/${id}`)
      .set('Cookie', editorCookie)
      .send({ title: 'Updated Resource', fileId: replacementMedia.id })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/downloads/${id}/publish`)
      .set('Cookie', editorCookie)
      .send({ isPublished: false })
      .expect(200);
    await request(app.getHttpServer()).get(`/downloads/${slug}`).expect(404);

    await request(app.getHttpServer())
      .patch(`/downloads/${id}/publish`)
      .set('Cookie', editorCookie)
      .send({ isPublished: true })
      .expect(200);
    await request(app.getHttpServer()).get(`/downloads/${slug}`).expect(200);

    const auditCount = await prisma.auditLog.count({
      where: { entityType: 'Download', entityId: id, actorId: editor.id },
    });
    expect(auditCount).toBeGreaterThanOrEqual(4);

    const unprivileged = await createUser();
    await request(app.getHttpServer())
      .delete(`/downloads/${id}`)
      .set('Cookie', await login(unprivileged.email))
      .expect(403);

    const admin = await createUser('ADMINISTRATOR');
    await request(app.getHttpServer())
      .delete(`/downloads/${id}`)
      .set('Cookie', await login(admin.email))
      .expect(204);

    const deletionAuditCount = await prisma.auditLog.count({
      where: {
        entityType: 'Download',
        entityId: id,
        action: 'CONTENT_DELETED',
      },
    });
    expect(deletionAuditCount).toBe(1);
  });

  it('lists only published downloads publicly, and everything to admins', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);
    const media = await createFileMedia();

    const published = await request(app.getHttpServer())
      .post('/downloads')
      .set('Cookie', editorCookie)
      .send({
        slug: `${prefix}-listed-published`,
        title: 'Published Resource',
        fileId: media.id,
      })
      .expect(201);
    const draft = await request(app.getHttpServer())
      .post('/downloads')
      .set('Cookie', editorCookie)
      .send({
        slug: `${prefix}-listed-draft`,
        title: 'Draft Resource',
        fileId: media.id,
      })
      .expect(201);
    const draftId = (draft.body as Record<string, unknown>).id as string;
    await request(app.getHttpServer())
      .patch(`/downloads/${draftId}/publish`)
      .set('Cookie', editorCookie)
      .send({ isPublished: false })
      .expect(200);

    const publicList = await request(app.getHttpServer())
      .get('/downloads')
      .expect(200);
    const publicSlugs = (publicList.body as { slug: string }[]).map(
      (d) => d.slug,
    );
    expect(publicSlugs).toContain(
      (published.body as Record<string, unknown>).slug,
    );
    expect(publicSlugs).not.toContain(
      (draft.body as Record<string, unknown>).slug,
    );

    const adminList = await request(app.getHttpServer())
      .get('/downloads/admin')
      .set('Cookie', editorCookie)
      .expect(200);
    const adminSlugs = (
      adminList.body as { items: { slug: string }[] }
    ).items.map((d) => d.slug);
    expect(adminSlugs).toContain(
      (published.body as Record<string, unknown>).slug,
    );
    expect(adminSlugs).toContain((draft.body as Record<string, unknown>).slug);
  });
});
