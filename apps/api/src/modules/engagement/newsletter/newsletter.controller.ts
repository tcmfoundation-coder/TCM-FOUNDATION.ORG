import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrivilegedRole } from '@prisma/client';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';
import { ListSubscribersDto } from './dto/list-subscribers.dto';
import { TurnstileGuard } from '../../security/turnstile/turnstile.guard';
import { PUBLIC_WRITE_THROTTLE } from '../../security/throttle.constants';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../identity/auth/guards/roles.guard';
import { Roles } from '../../identity/auth/decorators/roles.decorator';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(200)
  @Throttle(PUBLIC_WRITE_THROTTLE)
  @UseGuards(TurnstileGuard)
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto.email);
  }

  /**
   * POST, not GET, even though it is reached from a link in an email: mail
   * scanners and link-preview bots follow GET links, and a GET here would let
   * them unsubscribe people who never clicked anything. The emailed link
   * opens a page on the web app, which posts here once the visitor confirms.
   *
   * Throttled like the other public writes, but not behind Turnstile — the
   * token is the credential, and making someone solve a challenge to leave a
   * mailing list is a dark pattern.
   */
  @Post('unsubscribe')
  @HttpCode(200)
  @Throttle(PUBLIC_WRITE_THROTTLE)
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.newsletter.unsubscribe(dto.token);
  }

  // Subscriber addresses are personal data, so this sits at the same tier as
  // the other Operations screens rather than with routine content editing.
  @Get('subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  listSubscribers(@Query() query: ListSubscribersDto) {
    return this.newsletter.listSubscribers(query.skip ?? 0, query.take ?? 25);
  }
}
