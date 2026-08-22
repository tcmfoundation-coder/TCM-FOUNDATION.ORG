import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  createMailService,
  MailConfigurationError,
} from './mail-provider.factory';
import { ConsoleMailAdapter } from './console-mail.adapter';
import { UnconfiguredMailAdapter } from './unconfigured-mail.adapter';
import { ResendMailAdapter } from './resend-mail.adapter';

describe('createMailService (provider selection)', () => {
  let logged: string[];

  function configOf(env: Record<string, string | undefined>): ConfigService {
    return { get: (key: string) => env[key] } as unknown as ConfigService;
  }

  beforeEach(() => {
    logged = [];
    for (const level of ['log', 'error', 'warn'] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation((...args: unknown[]) => {
          logged.push(args.map((a) => String(a)).join(' '));
        });
    }
  });

  afterEach(() => jest.restoreAllMocks());

  describe('development and test', () => {
    it('uses the console adapter when no provider is configured', () => {
      expect(
        createMailService(configOf({ NODE_ENV: 'development' })),
      ).toBeInstanceOf(ConsoleMailAdapter);
      expect(createMailService(configOf({ NODE_ENV: 'test' }))).toBeInstanceOf(
        ConsoleMailAdapter,
      );
      // NODE_ENV unset behaves as non-production too.
      expect(createMailService(configOf({}))).toBeInstanceOf(
        ConsoleMailAdapter,
      );
    });

    it('uses the console adapter when explicitly requested', () => {
      expect(
        createMailService(
          configOf({ NODE_ENV: 'development', EMAIL_PROVIDER: 'console' }),
        ),
      ).toBeInstanceOf(ConsoleMailAdapter);
    });

    it('allows a developer to opt into Resend locally', () => {
      const service = createMailService(
        configOf({
          NODE_ENV: 'development',
          EMAIL_PROVIDER: 'resend',
          RESEND_API_KEY: 're_local_key',
          EMAIL_FROM: 'TCM <noreply@example.test>',
        }),
      );
      expect(service).toBeInstanceOf(ResendMailAdapter);
    });
  });

  describe('production', () => {
    it('selects the Resend adapter when fully configured', () => {
      const service = createMailService(
        configOf({
          NODE_ENV: 'production',
          EMAIL_PROVIDER: 'resend',
          RESEND_API_KEY: 're_prod_key',
          EMAIL_FROM: 'TCM <noreply@example.test>',
        }),
      );
      expect(service).toBeInstanceOf(ResendMailAdapter);
    });

    it('falls back to the fail-loud adapter when no provider is set — never to console', () => {
      const service = createMailService(configOf({ NODE_ENV: 'production' }));
      expect(service).toBeInstanceOf(UnconfiguredMailAdapter);
      expect(service).not.toBeInstanceOf(ConsoleMailAdapter);
      expect(logged.join('\n')).toContain('EMAIL_PROVIDER is not set');
    });

    it('refuses to run the console adapter in production', () => {
      expect(() =>
        createMailService(
          configOf({ NODE_ENV: 'production', EMAIL_PROVIDER: 'console' }),
        ),
      ).toThrow(MailConfigurationError);
    });
  });

  describe('configuration errors', () => {
    it('rejects an unsupported provider with a clear message', () => {
      expect(() =>
        createMailService(
          configOf({ NODE_ENV: 'production', EMAIL_PROVIDER: 'sendgrid' }),
        ),
      ).toThrow(/Unsupported EMAIL_PROVIDER "sendgrid"/);
    });

    it('requires an API key when Resend is selected', () => {
      expect(() =>
        createMailService(
          configOf({
            NODE_ENV: 'production',
            EMAIL_PROVIDER: 'resend',
            EMAIL_FROM: 'TCM <noreply@example.test>',
          }),
        ),
      ).toThrow(/requires RESEND_API_KEY/);
    });

    it('requires a sender address when Resend is selected', () => {
      expect(() =>
        createMailService(
          configOf({
            NODE_ENV: 'production',
            EMAIL_PROVIDER: 'resend',
            RESEND_API_KEY: 're_prod_key',
          }),
        ),
      ).toThrow(/requires EMAIL_FROM/);
    });

    it('never includes the API key in a configuration error or log', () => {
      const key = 're_super_secret_value';
      try {
        createMailService(
          configOf({
            NODE_ENV: 'production',
            EMAIL_PROVIDER: 'resend',
            RESEND_API_KEY: key,
          }),
        );
      } catch (error) {
        expect((error as Error).message).not.toContain(key);
      }
      expect(logged.join('\n')).not.toContain(key);
    });

    it('is tolerant of casing and surrounding whitespace', () => {
      expect(
        createMailService(
          configOf({ NODE_ENV: 'development', EMAIL_PROVIDER: '  CONSOLE ' }),
        ),
      ).toBeInstanceOf(ConsoleMailAdapter);
    });
  });
});
