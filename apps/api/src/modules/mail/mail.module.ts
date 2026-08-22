import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_SERVICE } from './mail.service';
import { createMailService } from './mail-provider.factory';

/**
 * Global for the same reason AuditModule is: transactional email is a
 * cross-cutting concern with more than one consumer (auth's verification and
 * password-reset mail, and the newsletter's confirmation mail), and making
 * each of them import an unrelated feature module to reach it would be worse
 * than declaring it once here.
 *
 * Provider selection still lives in createMailService — see that file for the
 * console/Resend/unconfigured rules.
 */
@Global()
@Module({
  providers: [
    {
      provide: MAIL_SERVICE,
      useFactory: (config: ConfigService) => createMailService(config),
      inject: [ConfigService],
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
