import { Logger, NotFoundException } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import type { SendEmailOptions } from '../../mail/mail.service';

describe('NewsletterService', () => {
  const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

  // Argument generics so `.mock.calls[0][0]` has a known shape rather than
  // being `any`.
  type Call = [Record<string, unknown>];
  let prisma: {
    newsletterSubscriber: {
      findUnique: jest.Mock;
      upsert: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
      update: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
      findMany: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mail: { send: jest.Mock<Promise<void>, [SendEmailOptions]> };
  let service: NewsletterService;
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

    prisma = {
      newsletterSubscriber: {
        findUnique: jest.fn(),
        upsert: jest.fn<Promise<unknown>, Call>().mockResolvedValue({}),
        update: jest.fn<Promise<unknown>, Call>().mockResolvedValue({}),
        findMany: jest.fn<Promise<unknown>, Call>(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    mail = {
      send: jest
        .fn<Promise<void>, [SendEmailOptions]>()
        .mockResolvedValue(undefined),
    };
    const config = {
      get: (key: string) =>
        key === 'APP_BASE_URL' ? 'https://tcm.example' : undefined,
    };

    service = new NewsletterService(prisma as never, config as never, mail);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('subscribe', () => {
    it('stores a new subscriber with a high-entropy unsubscribe token', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null);

      const result = await service.subscribe('person@example.test');

      expect(result).toEqual({ alreadySubscribed: false });
      const args = prisma.newsletterSubscriber.upsert.mock.calls[0][0] as {
        create: { unsubscribeToken: string };
      };
      expect(args.create.unsubscribeToken).toMatch(TOKEN_PATTERN);
    });

    it('sends a confirmation email containing the unsubscribe link', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null);

      await service.subscribe('person@example.test');

      expect(mail.send).toHaveBeenCalledTimes(1);
      const sent = mail.send.mock.calls[0][0] as {
        to: string;
        subject: string;
        text: string;
        html: string;
      };
      expect(sent.to).toBe('person@example.test');
      expect(sent.subject).toBe('Thank you for subscribing to TCM Foundation');
      expect(sent.text).toContain('Thank you for subscribing');
      expect(sent.text).toMatch(
        /https:\/\/tcm\.example\/newsletter\/unsubscribe\?token=[a-f0-9]{64}/,
      );
      expect(sent.html).toContain('Unsubscribe');
    });

    it('does not email again when the address is already subscribed', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({
        status: 'SUBSCRIBED',
      });

      const result = await service.subscribe('person@example.test');

      expect(result).toEqual({ alreadySubscribed: true });
      expect(mail.send).not.toHaveBeenCalled();
      expect(prisma.newsletterSubscriber.upsert).not.toHaveBeenCalled();
    });

    it('re-subscribes a previously unsubscribed address with a fresh token', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({
        status: 'UNSUBSCRIBED',
      });

      await service.subscribe('person@example.test');

      const args = prisma.newsletterSubscriber.upsert.mock.calls[0][0] as {
        update: {
          status: string;
          unsubscribedAt: null;
          unsubscribeToken: string;
        };
      };
      expect(args.update.status).toBe('SUBSCRIBED');
      expect(args.update.unsubscribedAt).toBeNull();
      // Rotated, so a link from the previous subscription cannot be replayed.
      expect(args.update.unsubscribeToken).toMatch(TOKEN_PATTERN);
    });

    it('still succeeds when the confirmation email fails to send', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null);
      mail.send.mockRejectedValue(new Error('provider down'));

      // The subscription is what the visitor asked for; a mail failure must
      // not fail their request.
      await expect(service.subscribe('person@example.test')).resolves.toEqual({
        alreadySubscribed: false,
      });
      expect(logged.join('\n')).toContain('EMAIL_SEND_FAILURE');
      expect(logged.join('\n')).toContain('type=newsletter_confirmation');
    });

    it('never logs the address or the token on a mail failure', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null);
      mail.send.mockRejectedValue(new Error('provider down'));

      await service.subscribe('person@example.test');

      const token = (
        prisma.newsletterSubscriber.upsert.mock.calls[0][0] as {
          create: { unsubscribeToken: string };
        }
      ).create.unsubscribeToken;

      const all = logged.join('\n');
      expect(all).not.toContain('person@example.test');
      expect(all).not.toContain(token);
    });
  });

  describe('unsubscribe', () => {
    it('marks a subscribed address as unsubscribed and returns it', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'person@example.test',
        status: 'SUBSCRIBED',
      });

      const result = await service.unsubscribe('a'.repeat(64));

      expect(result).toEqual({ email: 'person@example.test' });
      const args = prisma.newsletterSubscriber.update.mock.calls[0][0] as {
        data: { status: string; unsubscribedAt: Date };
      };
      expect(args.data.status).toBe('UNSUBSCRIBED');
      expect(args.data.unsubscribedAt).toBeInstanceOf(Date);
    });

    it('is idempotent — a second click is a success, not an error', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue({
        id: 'sub-1',
        email: 'person@example.test',
        status: 'UNSUBSCRIBED',
      });

      await expect(service.unsubscribe('a'.repeat(64))).resolves.toEqual({
        email: 'person@example.test',
      });
      expect(prisma.newsletterSubscriber.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown token rather than silently reporting success', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValue(null);

      await expect(service.unsubscribe('b'.repeat(64))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listSubscribers', () => {
    it('reports both the total and the reachable count', async () => {
      prisma.$transaction.mockResolvedValue([
        [{ id: 'sub-1', email: 'person@example.test' }],
        10,
        7,
      ]);

      const result = await service.listSubscribers(0, 25);

      expect(result.total).toBe(10);
      expect(result.subscribedCount).toBe(7);
      expect(result.items).toHaveLength(1);
    });

    it('never selects the unsubscribe token', async () => {
      prisma.$transaction.mockResolvedValue([[], 0, 0]);

      await service.listSubscribers(0, 25);

      const args = prisma.newsletterSubscriber.findMany.mock.calls[0][0] as {
        select: Record<string, boolean>;
      };
      // It is a credential — the admin list has no use for it.
      expect(args.select.unsubscribeToken).toBeUndefined();
      expect(args.select.email).toBe(true);
    });
  });
});
