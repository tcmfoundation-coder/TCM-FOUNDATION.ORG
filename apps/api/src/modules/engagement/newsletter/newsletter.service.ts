import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string): Promise<{ alreadySubscribed: boolean }> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing?.status === 'SUBSCRIBED') {
      return { alreadySubscribed: true };
    }

    await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        status: 'SUBSCRIBED',
        subscribedAt: new Date(),
        unsubscribedAt: null,
      },
      create: { email, status: 'SUBSCRIBED' },
    });

    return { alreadySubscribed: false };
  }
}
