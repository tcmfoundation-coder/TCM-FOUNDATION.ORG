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
      // Must land on the WEB origin's /api-proxy rewrite, not the API origin
      // directly — Google redirects the browser here, so whatever host this
      // is, that's the host every Set-Cookie from the rest of the flow gets
      // scoped to. Railway's api-*/web-*.up.railway.app hosts are different
      // registrable domains (up.railway.app is on the Public Suffix List),
      // so a direct API callback URL would set the session cookies
      // cross-site — SameSite=Lax cookies are then dropped by the browser
      // and the user lands on the dashboard signed out. Routing through
      // next.config.ts's /api-proxy rewrite keeps every cookie first-party
      // to the web origin, the same fix already used for password login.
      callbackURL: `${config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000'}/api-proxy/auth/google/callback`,
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
