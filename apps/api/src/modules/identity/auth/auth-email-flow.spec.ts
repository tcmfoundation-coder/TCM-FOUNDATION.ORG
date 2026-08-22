import { Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ResendMailAdapter } from '../../mail/resend-mail.adapter';

/**
 * Exercises the real path business logic takes in production:
 *
 *   AuthService -> MailService (MAIL_SERVICE) -> ResendMailAdapter -> Resend
 *
 * Only the Resend SDK itself is mocked, so no email leaves the machine. The
 * point is to prove AuthService still depends purely on the abstraction and
 * that the two flows keep their distinct failure behaviour.
 */
describe('Auth email flows through ResendMailAdapter', () => {
  const FROM = 'TCM Foundation <noreply@example-verified-domain.test>';
  const user = {
    id: 'user-1',
    email: 'person@example.test',
    passwordHash: 'hash',
  };

  // Typed generics so mock call arguments are a known shape rather than `any`.
  let resendSend: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let auth: AuthService;
  let logged: string[];

  beforeEach(() => {
    logged = [];
    for (const level of ['log', 'error', 'warn'] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation((...args: unknown[]) => {
          logged.push(args.map((a) => String(a)).join(' '));
        });
    }

    resendSend = jest
      .fn<Promise<unknown>, [Record<string, unknown>]>()
      .mockResolvedValue({ data: { id: 'msg_abc' }, error: null });
    const mail = new ResendMailAdapter(
      { emails: { send: resendSend } } as never,
      FROM,
    );

    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
    };
    const config = {
      get: (key: string) =>
        key === 'APP_BASE_URL' ? 'https://admin.example.test' : undefined,
    };

    auth = new AuthService(
      prisma as never, // only the `user` delegate is reached by these flows
      {} as never, // TokenService — unused by these two flows
      {} as never, // MfaService
      config as never,
      { record: jest.fn() } as never, // AuditLogService
      mail,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('email verification', () => {
    it('delivers through Resend with the verification URL intact', async () => {
      await auth.sendEmailVerification(user.id, user.email);

      expect(resendSend).toHaveBeenCalledTimes(1);
      const payload = resendSend.mock.calls[0][0] as Record<string, string>;
      expect(payload.from).toBe(FROM);
      expect(payload.to).toBe(user.email);
      expect(payload.subject).toBe('Verify your TCM Foundation account email');
      expect(payload.html).toContain(
        'https://admin.example.test/admin/verify-email?token=',
      );
      expect(payload.text).toContain(
        'https://admin.example.test/admin/verify-email?token=',
      );
    });

    it('surfaces a delivery failure rather than reporting false success', async () => {
      resendSend.mockResolvedValue({
        data: null,
        error: { name: 'domain_not_verified', statusCode: 403 },
      });

      // The admin who triggered this needs to know the email did not go out.
      await expect(
        auth.sendEmailVerification(user.id, user.email),
      ).rejects.toThrow();
    });
  });

  describe('password reset', () => {
    it('delivers through Resend with the reset URL intact', async () => {
      await auth.requestPasswordReset(user.email);

      const payload = resendSend.mock.calls[0][0] as Record<string, string>;
      expect(payload.from).toBe(FROM);
      expect(payload.to).toBe(user.email);
      expect(payload.subject).toBe('Reset your TCM Foundation password');
      expect(payload.text).toContain(
        'https://admin.example.test/admin/reset-password?token=',
      );
    });

    it('stays enumeration-safe when Resend fails: resolves, does not throw', async () => {
      resendSend.mockResolvedValue({
        data: null,
        error: { name: 'rate_limit_exceeded', statusCode: 429 },
      });

      // Must behave exactly as it does for an unknown address — a throw here
      // would turn the endpoint into an account-enumeration oracle.
      await expect(
        auth.requestPasswordReset(user.email),
      ).resolves.toBeUndefined();
      expect(logged.join('\n')).toContain('EMAIL_SEND_FAILURE');
      expect(logged.join('\n')).toContain('category=rate_limited');
    });

    it('sends nothing at all for an address with no account', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        auth.requestPasswordReset('nobody@example.test'),
      ).resolves.toBeUndefined();
      expect(resendSend).not.toHaveBeenCalled();
    });

    it('never logs the reset token or full URL', async () => {
      resendSend.mockResolvedValue({
        data: null,
        error: { name: 'internal_server_error', statusCode: 500 },
      });
      await auth.requestPasswordReset(user.email);

      const sentUrl = (
        resendSend.mock.calls[0][0] as Record<string, string>
      ).text.match(/https?:\/\/\S+/)![0];
      const token = new URL(sentUrl).searchParams.get('token')!;

      const all = logged.join('\n');
      expect(token.length).toBeGreaterThan(10);
      expect(all).not.toContain(token);
      expect(all).not.toContain(sentUrl);
    });
  });
});
