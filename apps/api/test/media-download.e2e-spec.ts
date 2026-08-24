import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// GET /media/:id/download — the admin Media Library's "Download" action.
// Same architecture as GET /downloads/:slug/file (see downloads.e2e-spec.ts
// for the fuller rationale): the API streams the file itself instead of
// handing the browser a Cloudinary URL. Cloudinary is mocked at the fetch
// layer rather than exercised for real, consistent with how this codebase
// already avoids re-exercising the real Cloudinary integration in e2e
// suites (see downloads.e2e-spec.ts's createFileMedia comment).
describe('GET /media/:id/download (e2e)', () => {
  const runId = Date.now();
  const prefix = `media-dl-e2e-${runId}`;
  const password = 'MediaDownloadE2ePassw0rd!!';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const pdfBytes = Buffer.from('%PDF-1.3\nfake pdf bytes for e2e\n%%EOF');
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

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
    await prisma.media.deleteMany({
      where: { cloudinaryPublicId: { startsWith: prefix } },
    });
    await prisma.userRole.deleteMany({
      where: { user: { email: { startsWith: prefix } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(pdfBytes, {
        status: 200,
        headers: { 'content-length': String(pdfBytes.length) },
      }),
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
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

  it('rejects an unauthenticated request without touching storage', async () => {
    const media = await prisma.media.create({
      data: {
        cloudinaryPublicId: `${prefix}-${Math.random()}.pdf`,
        secureUrl: 'https://res.cloudinary.com/test/raw/upload/fixture.pdf',
        type: 'DOCUMENT',
        mimeType: 'application/pdf',
        altText: 'Fixture document',
      },
    });
    await request(app.getHttpServer())
      .get(`/media/${media.id}/download`)
      .expect(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('streams the real bytes with a correct Content-Type and an attachment Content-Disposition for a privileged user', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    const media = await prisma.media.create({
      data: {
        cloudinaryPublicId: `${prefix}-${Math.random()}.pdf`,
        secureUrl: 'https://res.cloudinary.com/test/raw/upload/fixture.pdf',
        type: 'DOCUMENT',
        mimeType: 'application/pdf',
        altText: 'Board meeting minutes',
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/media/${media.id}/download`)
      .set('Cookie', await login(editor.email))
      .expect(200);

    expect(fetchSpy).toHaveBeenCalledWith(media.secureUrl);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain(
      'filename="Board meeting minutes.pdf"',
    );
    expect(Buffer.compare(response.body as Buffer, pdfBytes)).toBe(0);
  });

  it('404s for a media id that does not exist, without touching storage', async () => {
    const editor = await createUser('CONTENT_EDITOR');
    await request(app.getHttpServer())
      .get('/media/cabcdefghijklmnopqrstuvwx/download')
      .set('Cookie', await login(editor.email))
      .expect(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
