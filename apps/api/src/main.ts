import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind a reverse proxy (any managed host terminates TLS in front of the
  // app), every request otherwise reports the proxy's address as `req.ip`.
  // That single value then feeds rate limiting, audit-log `ipAddress`, and
  // Turnstile's `remoteip` — so the per-IP throttle silently degrades into
  // one bucket shared by the whole internet, and audit entries all record
  // the proxy.
  //
  // Left OFF by default because the opposite mistake is worse: trusting
  // X-Forwarded-For with no proxy in front lets any client spoof its own IP
  // and bypass rate limiting entirely. Set TRUST_PROXY_HOPS to the number of
  // proxies actually in front of this app once the deployment topology is
  // known (typically 1).
  const trustProxyHops = Number.parseInt(
    process.env.TRUST_PROXY_HOPS ?? '',
    10,
  );
  const logger = new Logger('Bootstrap');
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  } else if (process.env.NODE_ENV === 'production') {
    logger.warn(
      'TRUST_PROXY_HOPS is not set. If this instance runs behind a reverse proxy, client IPs will all resolve to the proxy — degrading per-IP rate limiting and audit-log IP accuracy.',
    );
  }

  // APP_BASE_URL has a localhost fallback in four places (CORS origin, the
  // OAuth redirect, and the email verification and password-reset links). That
  // default is correct for development and silently wrong in production, where
  // it would block the real site's CORS and mail out reset links pointing at
  // localhost.
  if (process.env.NODE_ENV === 'production' && !process.env.APP_BASE_URL) {
    logger.warn(
      'APP_BASE_URL is not set. CORS will only allow http://localhost:3000 and password-reset/verification links will point at localhost.',
    );
  }

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TCM Foundation API')
      .setDescription('TCM Foundation V1 backend API')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
