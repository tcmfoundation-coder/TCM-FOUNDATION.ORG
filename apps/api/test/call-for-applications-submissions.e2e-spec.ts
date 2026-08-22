import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Application submissions (e2e)', () => {
  const runId = Date.now();
  const prefix = `cfa-sub-e2e-${runId}`;
  const password = 'CfaSubmissionsE2ePassw0rd!!';
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
    const calls = await prisma.callForApplication.findMany({
      where: { slug: { startsWith: prefix } },
      select: { id: true, submissions: { select: { id: true } } },
    });
    const callIds = calls.map((call) => call.id);
    const submissionIds = calls.flatMap((call) =>
      call.submissions.map((submission) => submission.id),
    );

    // AuditLog.entityId is a plain string, not a FK — it does not
    // cascade-delete with the CallForApplication/ApplicationSubmission rows
    // it references, so it must be cleaned up explicitly.
    await prisma.auditLog.deleteMany({
      where: {
        entityType: 'ApplicationSubmission',
        entityId: { in: submissionIds },
      },
    });
    // ApplicationField and ApplicationSubmission both cascade-delete with
    // their parent CallForApplication (see schema.prisma onDelete: Cascade).
    await prisma.callForApplication.deleteMany({
      where: { id: { in: callIds } },
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

  async function createCampaign(
    slug: string,
    status: 'DRAFT' | 'OPEN' | 'CLOSED',
  ) {
    const call = await prisma.callForApplication.create({
      data: { slug, title: `Campaign ${slug}`, status },
    });
    const nameField = await prisma.applicationField.create({
      data: {
        callForApplicationId: call.id,
        label: 'Full name',
        fieldType: 'SHORT_TEXT',
        isRequired: true,
        order: 0,
      },
    });
    const trackField = await prisma.applicationField.create({
      data: {
        callForApplicationId: call.id,
        label: 'Track',
        fieldType: 'SINGLE_SELECT',
        isRequired: true,
        options: ['Business', 'Career'],
        order: 1,
      },
    });
    return { call, nameField, trackField };
  }

  it('rejects submissions to a nonexistent campaign', async () => {
    await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${prefix}-missing/submissions`)
      .send({
        applicantName: 'A',
        applicantEmail: 'a@example.com',
        consentedToContact: true,
        answers: {},
      })
      .expect(404);
  });

  it('rejects submissions to a campaign that is not OPEN', async () => {
    const { call, nameField, trackField } = await createCampaign(
      `${prefix}-draft`,
      'DRAFT',
    );
    await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${call.slug}/submissions`)
      .send({
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        consentedToContact: true,
        answers: { [nameField.id]: 'Amina Yusuf', [trackField.id]: 'Business' },
      })
      .expect(400);
  });

  it('rejects a submission missing a required field', async () => {
    const { call, nameField } = await createCampaign(
      `${prefix}-open-1`,
      'OPEN',
    );
    await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${call.slug}/submissions`)
      .send({
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        consentedToContact: true,
        answers: { [nameField.id]: 'Amina Yusuf' },
      })
      .expect(400);
  });

  it('rejects a submission referencing an unknown field id', async () => {
    const { call, nameField, trackField } = await createCampaign(
      `${prefix}-open-2`,
      'OPEN',
    );
    await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${call.slug}/submissions`)
      .send({
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        consentedToContact: true,
        answers: {
          [nameField.id]: 'Amina Yusuf',
          [trackField.id]: 'Business',
          'not-a-real-field': 'x',
        },
      })
      .expect(400);
  });

  it('rejects a malformed submission body (missing required top-level fields)', async () => {
    const { call } = await createCampaign(`${prefix}-open-3`, 'OPEN');
    await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${call.slug}/submissions`)
      .send({ applicantName: '', applicantEmail: 'not-an-email' })
      .expect(400);
  });

  it('rejects a submission with no consent field at all', async () => {
    const { call, nameField, trackField } = await createCampaign(
      `${prefix}-open-consent-missing`,
      'OPEN',
    );
    await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${call.slug}/submissions`)
      .send({
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        answers: { [nameField.id]: 'Amina Yusuf', [trackField.id]: 'Business' },
      })
      .expect(400);
  });

  it('rejects a submission that explicitly declines consent', async () => {
    const { call, nameField, trackField } = await createCampaign(
      `${prefix}-open-consent-false`,
      'OPEN',
    );
    const response = await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${call.slug}/submissions`)
      .send({
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        consentedToContact: false,
        answers: { [nameField.id]: 'Amina Yusuf', [trackField.id]: 'Business' },
      })
      .expect(400);
    expect(JSON.stringify(response.body)).toContain('Terms and Conditions');
  });

  it('does not persist a submission that was rejected for missing consent', async () => {
    const { call, nameField, trackField } = await createCampaign(
      `${prefix}-open-consent-nopersist`,
      'OPEN',
    );
    await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${call.slug}/submissions`)
      .send({
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        consentedToContact: false,
        answers: { [nameField.id]: 'Amina Yusuf', [trackField.id]: 'Business' },
      })
      .expect(400);
    const count = await prisma.applicationSubmission.count({
      where: { callForApplicationId: call.id },
    });
    expect(count).toBe(0);
  });

  it('accepts a public submission, then lets authorized staff list, view, and review it', async () => {
    const { call, nameField, trackField } = await createCampaign(
      `${prefix}-open-4`,
      'OPEN',
    );

    const submitResponse = await request(app.getHttpServer())
      .post(`/call-for-applications/slug/${call.slug}/submissions`)
      .send({
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        consentedToContact: true,
        answers: { [nameField.id]: 'Amina Yusuf', [trackField.id]: 'Business' },
      })
      .expect(201);
    const submissionId = (submitResponse.body as Record<string, unknown>)
      .id as string;
    expect(submissionId).toBeTruthy();

    // Unauthenticated / unauthorized access to admin submission endpoints
    await request(app.getHttpServer())
      .get(`/call-for-applications/${call.id}/submissions`)
      .expect(401);

    const unprivileged = await createUser();
    await request(app.getHttpServer())
      .get(`/call-for-applications/${call.id}/submissions`)
      .set('Cookie', await login(unprivileged.email))
      .expect(403);

    const editor = await createUser('CONTENT_EDITOR');
    const editorCookie = await login(editor.email);

    const listResponse = await request(app.getHttpServer())
      .get(`/call-for-applications/${call.id}/submissions`)
      .set('Cookie', editorCookie)
      .expect(200);
    const listBody = listResponse.body as {
      items: { id: string }[];
      total: number;
      skip: number;
      take: number;
    };
    expect(listBody.items.some((item) => item.id === submissionId)).toBe(true);
    expect(listBody).toMatchObject({ skip: 0, take: 25 });

    const detailResponse = await request(app.getHttpServer())
      .get(`/call-for-applications/submissions/${submissionId}`)
      .set('Cookie', editorCookie)
      .expect(200);
    const detail = detailResponse.body as {
      applicantEmail: string;
      callForApplication: { slug: string };
      answers: { fieldId: string; label: string; value: unknown }[];
    };
    expect(detail.applicantEmail).toBe('amina@example.com');
    expect(detail.callForApplication.slug).toBe(call.slug);
    expect(detail.answers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: nameField.id,
          value: 'Amina Yusuf',
        }),
      ]),
    );

    await request(app.getHttpServer())
      .patch(`/call-for-applications/submissions/${submissionId}/status`)
      .set('Cookie', editorCookie)
      .send({ reviewStatus: 'IN_REVIEW' })
      .expect(200);

    // Re-applying the same status is rejected as a no-op
    await request(app.getHttpServer())
      .patch(`/call-for-applications/submissions/${submissionId}/status`)
      .set('Cookie', editorCookie)
      .send({ reviewStatus: 'IN_REVIEW' })
      .expect(400);

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        entityType: 'ApplicationSubmission',
        entityId: submissionId,
        action: 'SUBMISSION_STATUS_CHANGED',
        actorId: editor.id,
      },
    });
    expect(auditEntry).toBeTruthy();
    expect(auditEntry?.before).toMatchObject({ reviewStatus: 'NEW' });
    expect(auditEntry?.after).toMatchObject({ reviewStatus: 'IN_REVIEW' });
  });
});
