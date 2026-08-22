import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Programs management (e2e)', () => {
  const runId = Date.now();
  const prefix = `program-e2e-${runId}`;
  const password = 'ProgramsE2ePassw0rd!!';
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
    const programs = await prisma.program.findMany({
      where: { slug: { startsWith: prefix } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'Program',
        entityId: { in: programs.map((p) => p.id) },
      },
    });
    await prisma.program.deleteMany({
      where: { slug: { startsWith: prefix } },
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
      slug: `${prefix}-unauth`,
      title: 'Title',
      description: 'Description',
    };
    await request(app.getHttpServer())
      .post('/programs')
      .send(payload)
      .expect(401);

    const unprivileged = await createUser();
    await request(app.getHttpServer())
      .post('/programs')
      .set('Cookie', await login(unprivileged.email))
      .send(payload)
      .expect(403);
  });

  it('validates, creates, reads, updates, publishes, audits, and deletes a program', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);
    const slug = `${prefix}-managed`;

    await request(app.getHttpServer())
      .post('/programs')
      .set('Cookie', editorCookie)
      .send({ slug, title: '', description: 'Description' })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/programs')
      .set('Cookie', editorCookie)
      .send({ slug, title: 'Managed Program', description: 'Description' })
      .expect(201);
    const id = (created.body as Record<string, unknown>).id as string;

    await request(app.getHttpServer())
      .post('/programs')
      .set('Cookie', editorCookie)
      .send({ slug, title: 'Duplicate', description: 'Description' })
      .expect(409);

    await request(app.getHttpServer())
      .get(`/programs/id/${id}`)
      .set('Cookie', editorCookie)
      .expect(200);
    await request(app.getHttpServer())
      .get('/programs/id/missing')
      .set('Cookie', editorCookie)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/programs/${id}`)
      .set('Cookie', editorCookie)
      .send({ title: 'Updated Program' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/programs/${id}/publish`)
      .set('Cookie', editorCookie)
      .expect(200);
    await request(app.getHttpServer()).get(`/programs/${slug}`).expect(200);
    await request(app.getHttpServer())
      .post(`/programs/${id}/unpublish`)
      .set('Cookie', editorCookie)
      .expect(200);

    const auditCount = await prisma.auditLog.count({
      where: { entityType: 'Program', entityId: id, actorId: editor.id },
    });
    expect(auditCount).toBeGreaterThanOrEqual(4);

    const unprivileged = await createUser();
    await request(app.getHttpServer())
      .delete(`/programs/${id}`)
      .set('Cookie', await login(unprivileged.email))
      .expect(403);

    const admin = await createUser('ADMINISTRATOR');
    await request(app.getHttpServer())
      .delete(`/programs/${id}`)
      .set('Cookie', await login(admin.email))
      .expect(204);
  });
});
