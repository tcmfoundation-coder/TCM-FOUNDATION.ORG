import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { MAIL_SERVICE, type MailService } from '../../mail/mail.service';
import { newsletterConfirmationEmail } from '../../mail/templates/newsletter-emails';
import { MailDeliveryError } from '../../mail/resend-mail.adapter';

// Opaque and high-entropy: it is the only credential needed to unsubscribe,
// so it must not be guessable from the address it belongs to.
function generateUnsubscribeToken(): string {
  return randomBytes(32).toString('hex');
}

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
  ) {}

  private siteUrl(): string {
    return this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
  }

  async subscribe(email: string): Promise<{ alreadySubscribed: boolean }> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing?.status === 'SUBSCRIBED') {
      // No second confirmation email: re-submitting the form must not become
      // a way to make us mail an address repeatedly.
      return { alreadySubscribed: true };
    }

    // Rotated on every (re)subscribe, so a link from an older subscription
    // cannot be replayed against the new one.
    const unsubscribeToken = generateUnsubscribeToken();

    await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        status: 'SUBSCRIBED',
        subscribedAt: new Date(),
        unsubscribedAt: null,
        unsubscribeToken,
      },
      create: { email, status: 'SUBSCRIBED', unsubscribeToken },
    });

    await this.sendConfirmation(email, unsubscribeToken);

    return { alreadySubscribed: false };
  }

  private async sendConfirmation(
    email: string,
    unsubscribeToken: string,
  ): Promise<void> {
    const site = this.siteUrl();
    const unsubscribeUrl = `${site}/newsletter/unsubscribe?token=${unsubscribeToken}`;

    try {
      await this.mail.send(
        newsletterConfirmationEmail(email, site, unsubscribeUrl),
      );
    } catch (error) {
      // The subscription itself already succeeded and is what the visitor
      // asked for, so a delivery failure must not fail their request or roll
      // it back. It is surfaced to operators here instead — category only,
      // never the address or the token.
      const category =
        error instanceof MailDeliveryError ? error.category : 'unknown';
      this.logger.error(
        `EMAIL_SEND_FAILURE type=newsletter_confirmation category=${category} — the subscription was saved but the confirmation email was not delivered.`,
      );
    }
  }

  /**
   * Token-based so the address never travels in a URL, where it would end up
   * in server logs and Referer headers. An unknown token is a 404 rather than
   * a silent success, so a mistyped link tells the visitor something is
   * wrong instead of pretending to have worked.
   */
  async unsubscribe(token: string): Promise<{ email: string }> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true, email: true, status: true },
    });

    if (!subscriber) {
      throw new NotFoundException('This unsubscribe link is not valid.');
    }

    if (subscriber.status === 'UNSUBSCRIBED') {
      // Idempotent: clicking the link twice is a success, not an error.
      return { email: subscriber.email };
    }

    await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });

    return { email: subscriber.email };
  }

  async listSubscribers(skip: number, take: number) {
    const [items, total, subscribedCount] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.findMany({
        // Never selects unsubscribeToken — it is a credential, and the admin
        // list has no use for it.
        select: {
          id: true,
          email: true,
          status: true,
          subscribedAt: true,
          unsubscribedAt: true,
        },
        orderBy: { subscribedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.newsletterSubscriber.count(),
      this.prisma.newsletterSubscriber.count({
        where: { status: 'SUBSCRIBED' },
      }),
    ]);

    // `total` counts every row; `subscribedCount` is the number actually
    // reachable, which is the figure that matters when planning a send.
    return { items, total, subscribedCount, skip, take };
  }
}
