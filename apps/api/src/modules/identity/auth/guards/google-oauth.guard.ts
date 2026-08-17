import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

// Wraps AuthGuard('google') with a config check so an unconfigured
// environment returns a clear 503 instead of passport's generic
// "Unknown authentication strategy" error (which is what happens if the
// 'google' strategy was never registered — see AuthModule).
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (
      !this.config.get('GOOGLE_OAUTH_CLIENT_ID') ||
      !this.config.get('GOOGLE_OAUTH_CLIENT_SECRET')
    ) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured yet',
      );
    }
    return super.canActivate(context);
  }
}
