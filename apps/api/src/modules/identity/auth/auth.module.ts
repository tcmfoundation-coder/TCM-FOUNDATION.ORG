import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditLogModule } from '../../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { MfaPendingGuard } from './guards/mfa-pending.guard';
import { MAIL_SERVICE } from './mail/mail.service';
import { ConsoleMailAdapter } from './mail/console-mail.adapter';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.register({}),
    AuditLogModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    MfaService,
    GoogleOAuthGuard,
    JwtAuthGuard,
    RolesGuard,
    MfaPendingGuard,
    { provide: MAIL_SERVICE, useClass: ConsoleMailAdapter },
    {
      // Only constructed when Google credentials are actually configured —
      // passport-google-oauth20's Strategy constructor throws on empty
      // clientID/clientSecret, so an unconfigured env must never reach it.
      // Returning null means the 'google' passport strategy is simply not
      // registered; GoogleOAuthGuard turns that into a clear 503 instead of
      // a crash at boot or an opaque error at request time.
      provide: GoogleStrategy,
      useFactory: (config: ConfigService) => {
        const clientID = config.get<string>('GOOGLE_OAUTH_CLIENT_ID');
        const clientSecret = config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');
        if (!clientID || !clientSecret) return null;
        return new GoogleStrategy(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, TokenService, MfaService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
