import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Opportunities management (e2e)', () => {
  const runId = Date.now();
  const prefix = `opportunity-e2e-${runId}`;
  const password = 'OpportunitiesE2ePassw0rd!!';
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
    const opportunities = await prisma.opportunity.findMany({
      where: { slug: { startsWith: prefix } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'Opportunity',
        entityId: { in: opportunities.map((o) => o.id) },
      },
    });
    await prisma.opportunity.deleteMany({
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

  function payload(slug: string) {
    return {
      slug,
      title: 'Chevening Scholarship',
      description: 'Fully funded postgraduate study.',
      type: 'EDUCATION',
      externalApplyUrl: 'https://example.org/apply',
    };
  }

  it('rejects unauthenticated and unprivileged mutations', async () => {
    const body = payload(`${prefix}-unauth`);

    await request(app.getHttpServer())
      .post('/opportunities')
      .send(body)
      .expect(401);

    const noRole = await createUser();
    const noRoleCookie = await login(noRole.email);
    await request(app.getHttpServer())
      .post('/opportunities')
      .set('Cookie', noRoleCookie)
      .send(body)
      .expect(403);

    await request(app.getHttpServer())
      .get('/opportunities/admin')
      .set('Cookie', noRoleCookie)
      .expect(403);
  });

  it('rejects invalid input', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const cookie = await login(editor.email);

    // Bad slug format
    await request(app.getHttpServer())
      .post('/opportunities')
      .set('Cookie', cookie)
      .send({ ...payload('Not A Slug'), slug: 'Not A Slug' })
      .expect(400);

    // Not a member of the OpportunityType enum
    await request(app.getHttpServer())
      .post('/opportunities')
      .set('Cookie', cookie)
      .send({ ...payload(`${prefix}-badtype`), type: 'NOT_A_TYPE' })
      .expect(400);

    // externalApplyUrl must be an absolute URL
    await request(app.getHttpServer())
      .post('/opportunities')
      .set('Cookie', cookie)
      .send({ ...payload(`${prefix}-badurl`), externalApplyUrl: 'nope' })
      .expect(400);
  });

  it('creates, reads, updates, publishes, audits, and deletes an opportunity', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);
    const admin = await createUser('ADMINISTRATOR');
    const adminCookie = await login(admin.email);

    const slug = `${prefix}-lifecycle`;
    const created = await request(app.getHttpServer())
      .post('/opportunities')
      .set('Cookie', editorCookie)
      .send(payload(slug))
      .expect(201);

    const id = (created.body as { id: string }).id;
    expect((created.body as { isPublished: boolean }).isPublished).toBe(true);

    // Duplicate slug is a conflict, not a 500.
    await request(app.getHttpServer())
      .post('/opportunities')
      .set('Cookie', editorCookie)
      .send(payload(slug))
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/opportunities/${id}`)
      .set('Cookie', editorCookie)
      .send({ title: 'Updated Opportunity' })
      .expect(200);

    // Unpublishing hides it from the public list but keeps it in the admin one.
    await request(app.getHttpServer())
      .patch(`/opportunities/${id}/publish`)
      .set('Cookie', editorCookie)
      .send({ isPublished: false })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/opportunities/${slug}`)
      .expect(404);

    const adminList = await request(app.getHttpServer())
      .get('/opportunities/admin?take=100')
      .set('Cookie', editorCookie)
      .expect(200);
    const adminItems = (adminList.body as { items: { id: string }[] }).items;
    expect(adminItems.some((item) => item.id === id)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/opportunities/${id}/publish`)
      .set('Cookie', editorCookie)
      .send({ isPublished: true })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/opportunities/${slug}`)
      .expect(200);

    // A CONTENT_EDITOR may not delete; ADMINISTRATOR may.
    await request(app.getHttpServer())
      .delete(`/opportunities/${id}`)
      .set('Cookie', editorCookie)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/opportunities/${id}`)
      .set('Cookie', adminCookie)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/opportunities/id/${id}`)
      .set('Cookie', adminCookie)
      .expect(404);

    const audits = await prisma.auditLog.findMany({
      where: { entityType: 'Opportunity', entityId: id },
      select: { action: true },
    });
    const actions = audits.map((a) => a.action);
    expect(actions).toContain('CONTENT_CREATED');
    expect(actions).toContain('CONTENT_DELETED');
    // One for the title edit plus one for each publish-state change — every
    // mutation in this lifecycle leaves its own audit entry.
    expect(actions.filter((a) => a === 'CONTENT_UPDATED')).toHaveLength(3);
  });

  it('keeps the public listing and type filter working', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const cookie = await login(editor.email);

    const slug = `${prefix}-filter`;
    await request(app.getHttpServer())
      .post('/opportunities')
      .set('Cookie', cookie)
      .send({ ...payload(slug), type: 'BUSINESS' })
      .expect(201);

    const matching = await request(app.getHttpServer())
      .get('/opportunities?type=BUSINESS&take=100')
      .expect(200);
    const matchingSlugs = (
      matching.body as { items: { slug: string; externalApplyUrl: string }[] }
    ).items;
    const found = matchingSlugs.find((item) => item.slug === slug);
    expect(found).toBeDefined();
    // The external application link is what this desk exists to hand out.
    expect(found?.externalApplyUrl).toBe('https://example.org/apply');

    const other = await request(app.getHttpServer())
      .get('/opportunities?type=CAREER&take=100')
      .expect(200);
    expect(
      (other.body as { items: { slug: string }[] }).items.some(
        (item) => item.slug === slug,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .get('/opportunities?type=BOGUS')
      .expect(400);
  });
});
