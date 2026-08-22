import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Support Requests (e2e)', () => {
  const runId = Date.now();
  const prefix = `support-e2e-${runId}`;
  const password = 'SupportE2ePassw0rd!!';
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
    const services = await prisma.supportService.findMany({
      where: { name: { startsWith: prefix } },
      select: { id: true, requests: { select: { id: true } } },
    });
    const serviceIds = services.map((s) => s.id);
    const requestIds = services.flatMap((s) => s.requests.map((r) => r.id));

    await prisma.auditLog.deleteMany({
      where: {
        entityType: { in: ['SupportRequest', 'SupportService'] },
        entityId: { in: [...requestIds, ...serviceIds] },
      },
    });
    await prisma.supportRequest.deleteMany({
      where: { id: { in: requestIds } },
    });
    await prisma.supportService.deleteMany({
      where: { id: { in: serviceIds } },
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

  async function createService(name: string, isActive = true) {
    return prisma.supportService.create({
      data: { name, isActive },
    });
  }

  it('rejects a malformed public submission', async () => {
    await request(app.getHttpServer())
      .post('/support-requests')
      .send({ requesterName: '', requesterEmail: 'not-an-email' })
      .expect(400);
  });

  it('rejects a submission against a nonexistent service', async () => {
    await request(app.getHttpServer())
      .post('/support-requests')
      .send({
        serviceId: 'cm00000000000000000000000',
        requesterName: 'Amina Yusuf',
        requesterEmail: 'amina@example.com',
        message: 'Hello',
      })
      .expect(404);
  });

  it('rejects a submission against an inactive service', async () => {
    const svc = await createService(`${prefix}-inactive`, false);
    await request(app.getHttpServer())
      .post('/support-requests')
      .send({
        serviceId: svc.id,
        requesterName: 'Amina Yusuf',
        requesterEmail: 'amina@example.com',
        message: 'Hello',
      })
      .expect(404);
  });

  it('blocks unauthenticated and unauthorized admin access', async () => {
    await request(app.getHttpServer()).get('/support-requests').expect(401);

    const unprivileged = await createUser();
    await request(app.getHttpServer())
      .get('/support-requests')
      .set('Cookie', await login(unprivileged.email))
      .expect(403);
  });

  it('accepts a public submission, then lets authorized staff list, view, update status, and assign a handler', async () => {
    const svc = await createService(`${prefix}-active`, true);

    const submitResponse = await request(app.getHttpServer())
      .post('/support-requests')
      .send({
        serviceId: svc.id,
        requesterName: 'Amina Yusuf',
        requesterEmail: 'amina@example.com',
        requesterPhone: '+2348000000000',
        message: 'I would like to book a career coaching session.',
      })
      .expect(201);
    const requestId = (submitResponse.body as Record<string, unknown>)
      .id as string;
    expect(requestId).toBeTruthy();

    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);

    const listResponse = await request(app.getHttpServer())
      .get('/support-requests')
      .set('Cookie', editorCookie)
      .expect(200);
    const listBody = listResponse.body as {
      items: { id: string }[];
      total: number;
      skip: number;
      take: number;
    };
    expect(listBody.items.some((item) => item.id === requestId)).toBe(true);
    expect(listBody).toMatchObject({ skip: 0, take: 25 });

    await request(app.getHttpServer())
      .get('/support-requests')
      .query({ status: 'RESOLVED' })
      .set('Cookie', editorCookie)
      .expect(200)
      .then((res) => {
        const body = res.body as { items: { id: string }[] };
        expect(body.items.some((item) => item.id === requestId)).toBe(false);
      });

    const detailResponse = await request(app.getHttpServer())
      .get(`/support-requests/${requestId}`)
      .set('Cookie', editorCookie)
      .expect(200);
    const detail = detailResponse.body as {
      requesterEmail: string;
      service: { name: string };
    };
    expect(detail.requesterEmail).toBe('amina@example.com');
    expect(detail.service.name).toBe(svc.name);

    await request(app.getHttpServer())
      .patch(`/support-requests/${requestId}/status`)
      .set('Cookie', editorCookie)
      .send({ status: 'NOT_A_STATUS' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/support-requests/${requestId}/status`)
      .set('Cookie', editorCookie)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/support-requests/${requestId}/handler`)
      .set('Cookie', editorCookie)
      .send({ handledById: editor.id })
      .expect(200)
      .then((res) => {
        const body = res.body as { handledBy: { email: string } | null };
        expect(body.handledBy?.email).toBe(editor.email);
      });

    await request(app.getHttpServer())
      .patch(`/support-requests/${requestId}/handler`)
      .set('Cookie', editorCookie)
      .send({ handledById: null })
      .expect(200)
      .then((res) => {
        const body = res.body as { handledBy: unknown };
        expect(body.handledBy).toBeNull();
      });

    await request(app.getHttpServer())
      .get('/support-requests/does-not-exist')
      .set('Cookie', editorCookie)
      .expect(404);

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        entityType: 'SupportRequest',
        entityId: requestId,
        action: 'SUBMISSION_STATUS_CHANGED',
      },
    });
    expect(auditEntry).toBeTruthy();
  });

  it('gates support-service management by role and audits changes', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const admin = await createUser('ADMINISTRATOR');

    await request(app.getHttpServer())
      .post('/support-services')
      .set('Cookie', await login(editor.email))
      .send({ name: `${prefix}-forbidden` })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/support-services')
      .set('Cookie', await login(admin.email))
      .send({ name: `${prefix}-service` })
      .expect(201);
    const serviceId = (created.body as Record<string, unknown>).id as string;

    const publicList = await request(app.getHttpServer())
      .get('/support-services')
      .expect(200);
    const services = publicList.body as { id: string }[];
    expect(services.some((s) => s.id === serviceId)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/support-services/${serviceId}`)
      .set('Cookie', await login(admin.email))
      .send({ isActive: false })
      .expect(200);

    // SUPER_ADMINISTRATOR-only delete: ADMINISTRATOR is forbidden
    await request(app.getHttpServer())
      .delete(`/support-services/${serviceId}`)
      .set('Cookie', await login(admin.email))
      .expect(403);
  });
});
