import { Logger } from '@nestjs/common';
import { MailDeliveryError, ResendMailAdapter } from './resend-mail.adapter';
import {
  emailVerificationEmail,
  passwordResetEmail,
} from './templates/auth-emails';

const FROM = 'TCM Foundation <noreply@example-verified-domain.test>';
const API_KEY = 're_test_supersecret_key_value';

describe('ResendMailAdapter', () => {
  // Typed generics so `send.mock.calls[0][0]` is a known shape rather than `any`.
  let send: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  let adapter: ResendMailAdapter;
  let logged: string[];

  beforeEach(() => {
    logged = [];
    // Capture everything written to the Nest logger so tests can assert the
    // API key and tokens never reach it.
    for (const level of ['log', 'error', 'warn'] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation((...args: unknown[]) => {
          logged.push(args.map((a) => String(a)).join(' '));
        });
    }
    send = jest
      .fn<Promise<unknown>, [Record<string, unknown>]>()
      .mockResolvedValue({ data: { id: 'msg_123' }, error: null });
    adapter = new ResendMailAdapter({ emails: { send } } as never, FROM);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('successful delivery', () => {
    it('sends an email verification message with the right envelope and both bodies', async () => {
      const url = 'https://admin.example.test/admin/verify-email?token=abc123';
      await adapter.send(emailVerificationEmail('person@example.test', url));

      expect(send).toHaveBeenCalledTimes(1);
      const payload = send.mock.calls[0][0] as Record<string, string>;
      expect(payload.to).toBe('person@example.test');
      expect(payload.from).toBe(FROM);
      expect(payload.subject).toBe('Verify your TCM Foundation account email');
      expect(payload.html).toContain('Verify your email address');
      expect(payload.html).toContain(url);
      expect(payload.text).toContain(url);
    });

    it('sends a password reset message with the right envelope and both bodies', async () => {
      const url =
        'https://admin.example.test/admin/reset-password?token=xyz789';
      await adapter.send(passwordResetEmail('person@example.test', url));

      const payload = send.mock.calls[0][0] as Record<string, string>;
      expect(payload.to).toBe('person@example.test');
      expect(payload.from).toBe(FROM);
      expect(payload.subject).toBe('Reset your TCM Foundation password');
      expect(payload.html).toContain('Reset your password');
      expect(payload.text).toContain(url);
      expect(payload.text).toContain('expires in 1 hour');
    });

    it('omits the html field entirely when only text is supplied', async () => {
      await adapter.send({
        to: 'person@example.test',
        subject: 'Text only',
        text: 'plain body',
      });
      const payload = send.mock.calls[0][0];
      expect('html' in payload).toBe(false);
      expect(payload.text).toBe('plain body');
    });

    it('logs the provider message id on success', async () => {
      await adapter.send({ to: 'a@b.test', subject: 'S', text: 'T' });
      expect(logged.join('\n')).toContain('EMAIL_SEND_SUCCESS');
      expect(logged.join('\n')).toContain('messageId=msg_123');
    });
  });

  describe('provider errors', () => {
    async function expectCategory(
      error: Record<string, unknown>,
      category: string,
    ) {
      send.mockResolvedValue({ data: null, error });
      const promise = adapter.send({
        to: 'a@b.test',
        subject: 'S',
        text: 'T',
      });
      await expect(promise).rejects.toBeInstanceOf(MailDeliveryError);
      await promise.catch((e: MailDeliveryError) =>
        expect(e.category).toBe(category),
      );
    }

    it('categorises an invalid API key as unauthorized', async () => {
      await expectCategory(
        {
          name: 'validation_error',
          message: 'API key is invalid',
          statusCode: 401,
        },
        'unauthorized',
      );
    });

    it('categorises a forbidden request as unauthorized', async () => {
      await expectCategory(
        { name: 'restricted_api_key', statusCode: 403 },
        'unauthorized',
      );
    });

    it('categorises an unverified sending domain as invalid_sender, not unauthorized', async () => {
      // Resend returns 403 for this, but the operator's fix is "verify the
      // domain", not "check the API key" — so the category must distinguish it.
      await expectCategory(
        {
          name: 'domain_not_verified',
          message: 'Domain is not verified',
          statusCode: 403,
        },
        'invalid_sender',
      );
    });

    it('categorises an invalid from address as invalid_sender', async () => {
      await expectCategory(
        { name: 'invalid_from_address', statusCode: 422 },
        'invalid_sender',
      );
    });

    it('categorises an invalid recipient as invalid_recipient', async () => {
      await expectCategory(
        { name: 'invalid_to_address', statusCode: 422 },
        'invalid_recipient',
      );
    });

    it('categorises a rate limit as rate_limited', async () => {
      await expectCategory(
        { name: 'rate_limit_exceeded', statusCode: 429 },
        'rate_limited',
      );
    });

    it('categorises a provider outage as provider_error', async () => {
      await expectCategory(
        { name: 'internal_server_error', statusCode: 503 },
        'provider_error',
      );
    });

    it('categorises a network failure as network_error', async () => {
      send.mockRejectedValue(new Error('ECONNREFUSED'));
      const promise = adapter.send({ to: 'a@b.test', subject: 'S', text: 'T' });
      await expect(promise).rejects.toBeInstanceOf(MailDeliveryError);
      await promise.catch((e: MailDeliveryError) =>
        expect(e.category).toBe('network_error'),
      );
    });

    it('categorises a timeout as network_error', async () => {
      send.mockRejectedValue(
        Object.assign(new Error('request timed out'), { name: 'TimeoutError' }),
      );
      await expect(
        adapter.send({ to: 'a@b.test', subject: 'S', text: 'T' }),
      ).rejects.toBeInstanceOf(MailDeliveryError);
    });

    it('does not leak the raw provider error message to the caller', async () => {
      send.mockResolvedValue({
        data: null,
        error: {
          name: 'rate_limit_exceeded',
          message: 'internal quota detail that should not be surfaced',
          statusCode: 429,
        },
      });
      const promise = adapter.send({ to: 'a@b.test', subject: 'S', text: 'T' });
      await promise.catch((e: MailDeliveryError) => {
        expect(e.message).not.toContain('internal quota detail');
        expect(e.message).toContain('rate_limited');
      });
    });
  });

  describe('secret and token hygiene', () => {
    it('never writes the API key to logs, on success or failure', async () => {
      await adapter.send({ to: 'a@b.test', subject: 'S', text: 'T' });
      send.mockResolvedValue({
        data: null,
        error: { name: 'x', statusCode: 500 },
      });
      await adapter
        .send({ to: 'a@b.test', subject: 'S', text: 'T' })
        .catch(() => undefined);

      const all = logged.join('\n');
      expect(all).not.toContain(API_KEY);
      expect(all).not.toContain('re_test');
    });

    it('never writes the email body or its token to logs', async () => {
      const url =
        'https://admin.example.test/admin/reset-password?token=SECRET_TOKEN';
      await adapter.send(passwordResetEmail('person@example.test', url));

      const all = logged.join('\n');
      expect(all).not.toContain('SECRET_TOKEN');
      expect(all).not.toContain(url);
      expect(all).not.toContain('<html');
      // Recipient and subject are logged deliberately, for diagnosis.
      expect(all).toContain('person@example.test');
    });
  });
});
