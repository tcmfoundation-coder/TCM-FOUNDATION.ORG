import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthGuard } from './google-oauth.guard';
import { COOKIE_NAMES } from '../auth.constants';
import { verifyOAuthState } from '../oauth-state.util';

const SECRET = 'test-session-cookie-secret';

function configWith(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const value = values[key];
      if (value === undefined) throw new Error(`Missing ${key}`);
      return value;
    },
  } as unknown as ConfigService;
}

describe('GoogleOAuthGuard', () => {
  it('rejects with 503 when Google OAuth is not configured', () => {
    const guard = new GoogleOAuthGuard(configWith({}));
    const context = { switchToHttp: () => ({}) } as unknown as ExecutionContext;
    expect(() => guard.canActivate(context)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('sets an httpOnly state cookie and hands Passport the same value as `state`', () => {
    const guard = new GoogleOAuthGuard(
      configWith({
        GOOGLE_OAUTH_CLIENT_ID: 'id',
        GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
        SESSION_COOKIE_SECRET: SECRET,
      }),
    );
    const setCookie = jest.fn();
    const context = {
      switchToHttp: () => ({ getResponse: () => ({ cookie: setCookie }) }),
    } as unknown as ExecutionContext;

    const options = guard.getAuthenticateOptions(context);

    expect(setCookie).toHaveBeenCalledTimes(1);
    const [cookieName, cookieValue, cookieOptions] = setCookie.mock
      .calls[0] as [string, string, Record<string, unknown>];
    expect(cookieName).toBe(COOKIE_NAMES.OAUTH_STATE);
    expect(cookieValue).toBe(options?.state);
    expect(cookieOptions).toMatchObject({ httpOnly: true, sameSite: 'lax' });
    // The cookie set for the browser and the `state` handed to Google must be
    // the SAME value — that equality is the entire CSRF check on the way back.
    expect(verifyOAuthState(cookieValue, options?.state, SECRET)).toBe(true);
  });
});
