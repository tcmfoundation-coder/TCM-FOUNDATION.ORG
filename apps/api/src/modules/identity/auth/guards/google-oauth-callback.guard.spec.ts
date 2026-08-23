import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthCallbackGuard } from './google-oauth-callback.guard';
import { generateOAuthState } from '../oauth-state.util';
import { COOKIE_NAMES } from '../auth.constants';

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

function contextWith(
  cookies: Record<string, string>,
  query: Record<string, string>,
) {
  const clearCookie = jest.fn();
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ cookies, query }),
      getResponse: () => ({ clearCookie }),
    }),
  } as unknown as ExecutionContext;
  return { context, clearCookie };
}

describe('GoogleOAuthCallbackGuard', () => {
  const config = configWith({
    GOOGLE_OAUTH_CLIENT_ID: 'id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
    SESSION_COOKIE_SECRET: SECRET,
  });

  it('rejects with 503 when Google OAuth is not configured', () => {
    const guard = new GoogleOAuthCallbackGuard(configWith({}));
    const { context } = contextWith({}, {});
    expect(() => guard.canActivate(context)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects a callback with no state cookie (missing state)', () => {
    const guard = new GoogleOAuthCallbackGuard(config);
    const state = generateOAuthState(SECRET);
    const { context } = contextWith({}, { state });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a callback with no query state at all', () => {
    const guard = new GoogleOAuthCallbackGuard(config);
    const state = generateOAuthState(SECRET);
    const { context } = contextWith({ [COOKIE_NAMES.OAUTH_STATE]: state }, {});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a callback whose query state does not match its cookie (invalid/forged state)', () => {
    const guard = new GoogleOAuthCallbackGuard(config);
    const cookieState = generateOAuthState(SECRET);
    const attackerState = generateOAuthState(SECRET);
    const { context } = contextWith(
      { [COOKIE_NAMES.OAUTH_STATE]: cookieState },
      { state: attackerState },
    );
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects an expired state', () => {
    const guard = new GoogleOAuthCallbackGuard(config);
    const now = Date.now();
    try {
      jest.useFakeTimers().setSystemTime(now);
      const state = generateOAuthState(SECRET);
      jest.setSystemTime(now + 11 * 60 * 1000); // TTL is 10 minutes
      const { context } = contextWith(
        { [COOKIE_NAMES.OAUTH_STATE]: state },
        { state },
      );
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears the state cookie on every attempt, so a rejected state cannot be replayed', () => {
    const guard = new GoogleOAuthCallbackGuard(config);
    const { context, clearCookie } = contextWith({}, {});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(clearCookie).toHaveBeenCalledWith(COOKIE_NAMES.OAUTH_STATE, {
      path: '/',
    });
  });

  it('rejects a second presentation of an already-consumed state (replay)', () => {
    const guard = new GoogleOAuthCallbackGuard(config);
    const state = generateOAuthState(SECRET);
    const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
      canActivate: (context: ExecutionContext) => unknown;
    };

    // First presentation: cookie still present, so it validates and the
    // cookie is cleared as a side effect.
    const first = contextWith({ [COOKIE_NAMES.OAUTH_STATE]: state }, { state });
    jest.spyOn(parentProto, 'canActivate').mockReturnValue(true);
    expect(guard.canActivate(first.context)).toBe(true);

    // Second presentation of the same `state` value: the browser no longer
    // carries the cookie (it was cleared), so this now fails exactly like a
    // missing-state request — a captured/replayed URL cannot be reused.
    const replay = contextWith({}, { state });
    expect(() => guard.canActivate(replay.context)).toThrow(
      UnauthorizedException,
    );

    jest.restoreAllMocks();
  });

  it('delegates to Passport once the state validates (does not block a legitimate callback)', () => {
    const guard = new GoogleOAuthCallbackGuard(config);
    const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(guard)) as {
      canActivate: (context: ExecutionContext) => unknown;
    };
    const parentCanActivate = jest
      .spyOn(parentProto, 'canActivate')
      .mockReturnValue(true);
    const state = generateOAuthState(SECRET);
    const { context } = contextWith(
      { [COOKIE_NAMES.OAUTH_STATE]: state },
      { state },
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(parentCanActivate).toHaveBeenCalledWith(context);

    parentCanActivate.mockRestore();
  });
});
