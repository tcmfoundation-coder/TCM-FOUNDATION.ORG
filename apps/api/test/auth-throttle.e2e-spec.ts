import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  AUTH_ATTEMPT_THROTTLE,
  PASSWORD_RESET_THROTTLE,
} from '../src/modules/security/throttle.constants';

/**
 * Covers Section C of the auth audit: /auth/login and friends must throttle
 * far more strictly than the global 100/min default, without creating a
 * denial-of-service vector that locks out every user behind a shared IP
 * (office network, NAT, VPN) over a handful of legitimate mistyped
 * passwords.
 *
 * Every test gets its OWN Nest application instance (see beforeEach/
 * afterEach). The e2e test harness never runs main.ts's bootstrap(), so
 * `trust proxy` is never enabled here and every request in every test
 * resolves to the same loopback IP — a single shared app across test cases
 * would mean one test's hits count toward the next test's limit. A fresh
 * app gives ThrottlerStorageService (see its "reset after TTL" unit
 * coverage in throttler-storage.spec.ts) an empty bucket per test.
 */
describe('Auth throttling (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();

  beforeEach(async () => {
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

  afterEach(async () => {
    await app.close();
  });

  it(`allows up to the configured limit (${AUTH_ATTEMPT_THROTTLE.default.limit}) of legitimate repeated login attempts from one IP before throttling`, async () => {
    const email = `e2e-throttle-legit-${runId}@test.local`;
    const password = 'ThrottleLegitPassw0rd!!';
    const passwordHash = await argon2.hash(password);
    await prisma.user.create({ data: { email, passwordHash } });

    const http = request(app.getHttpServer());

    // A real user mistyping their password a few times, then getting it
    // right, must never be blocked — this is well under the limit.
    for (let i = 0; i < AUTH_ATTEMPT_THROTTLE.default.limit - 1; i++) {
      const res = await http
        .post('/auth/login')
        .send({ email, password: 'wrong-password' });
      expect(res.status).toBe(401);
    }

    const finalRes = await http.post('/auth/login').send({ email, password });
    expect(finalRes.status).toBe(200);
  });

  it('rejects with 429 once a single IP exceeds the login limit, protecting every account behind it', async () => {
    const email = `e2e-throttle-block-${runId}@test.local`;
    const password = 'ThrottleBlockPassw0rd!!';
    const passwordHash = await argon2.hash(password);
    await prisma.user.create({ data: { email, passwordHash } });

    const http = request(app.getHttpServer());

    for (let i = 0; i < AUTH_ATTEMPT_THROTTLE.default.limit; i++) {
      const res = await http
        .post('/auth/login')
        .send({ email, password: 'wrong-password' });
      // Exactly at the limit — none of these are throttled yet.
      expect(res.status).toBe(401);
    }

    // One past the limit, even with the CORRECT password: the block applies
    // to the IP regardless of whether the credentials are finally right.
    const oneOver = await http.post('/auth/login').send({ email, password });
    expect(oneOver.status).toBe(429);
  });

  it('throttles /auth/mfa/login-verify independently of other routes', async () => {
    const http = request(app.getHttpServer());

    for (let i = 0; i < AUTH_ATTEMPT_THROTTLE.default.limit; i++) {
      const res = await http
        .post('/auth/mfa/login-verify')
        .send({ code: '000000' });
      expect(res.status).not.toBe(429);
    }
    const blocked = await http
      .post('/auth/mfa/login-verify')
      .send({ code: '000000' });
    expect(blocked.status).toBe(429);
  });

  it('throttles /auth/request-password-reset independently of other routes', async () => {
    const http = request(app.getHttpServer());
    const email = `e2e-throttle-reset-${runId}@test.local`;

    for (let i = 0; i < PASSWORD_RESET_THROTTLE.default.limit; i++) {
      const res = await http
        .post('/auth/request-password-reset')
        .send({ email });
      expect(res.status).toBe(200);
    }
    const blocked = await http
      .post('/auth/request-password-reset')
      .send({ email });
    expect(blocked.status).toBe(429);
  });
});
