import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import {
  Strategy,
  StrategyOptions,
  Profile,
  VerifyCallback,
} from 'passport-google-oauth20';

export type GoogleProfile = { googleId: string; email: string };

// Only ever constructed (see AuthModule's conditional provider factory)
// when GOOGLE_OAUTH_CLIENT_ID/SECRET are actually configured — the
// passport-google-oauth20 Strategy constructor throws on empty credentials,
// so an unconfigured environment must never reach `new GoogleStrategy(...)`.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const options: StrategyOptions = {
      clientID: config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET'),
      callbackURL: `${config.get<string>('API_BASE_URL') ?? 'http://localhost:4000'}/auth/google/callback`,
      scope: ['email', 'profile'],
    };
    super(options);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no email'), undefined);
      return;
    }
    const user: GoogleProfile = { googleId: profile.id, email };
    done(null, user);
  }
}
