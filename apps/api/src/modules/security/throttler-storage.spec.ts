import { ThrottlerStorageService } from '@nestjs/throttler';
import { AUTH_ATTEMPT_THROTTLE } from './throttle.constants';

/**
 * The "reset after TTL" case from Section C of the auth audit, tested
 * against the exact mechanism the app runs on (@nestjs/throttler's default
 * in-memory storage), using AUTH_ATTEMPT_THROTTLE's real limit/ttl values.
 *
 * A real 5-minute wait isn't practical in a test suite, and the e2e suite
 * (auth-throttle.e2e-spec.ts) never calls main.ts's bootstrap() so it can't
 * exercise a shortened TTL via a real deployment either. Blocking/unblocking
 * is decided by comparing `Date.now()` to a stored expiry timestamp (see
 * ThrottlerStorageService#increment in node_modules), not by waiting on a
 * timer callback, so mocking Date.now() exercises the real reset logic
 * deterministically and instantly.
 */
describe('ThrottlerStorageService (auth throttle reset-after-TTL)', () => {
  const { limit, ttl } = AUTH_ATTEMPT_THROTTLE.default;
  const KEY = 'test-ip:AuthController-login:default';
  const THROTTLER_NAME = 'default';

  let storage: ThrottlerStorageService;

  afterEach(() => {
    // increment() schedules a real setTimeout per hit (ttl = 5 minutes) to
    // decrement it later — onApplicationShutdown() is the library's own
    // cleanup hook for exactly this, and without it these tests leave real
    // 5-minute timers running and Jest hangs waiting for them to clear.
    storage.onApplicationShutdown();
    jest.restoreAllMocks();
  });

  it('blocks once hits exceed the limit within the TTL window', async () => {
    storage = new ThrottlerStorageService();

    let result: Awaited<ReturnType<typeof storage.increment>> | undefined;
    for (let i = 0; i <= limit; i++) {
      result = await storage.increment(KEY, ttl, limit, ttl, THROTTLER_NAME);
    }

    expect(result?.isBlocked).toBe(true);
  });

  it('unblocks once the block duration has elapsed, without waiting in real time', async () => {
    storage = new ThrottlerStorageService();
    const start = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(start);

    for (let i = 0; i <= limit; i++) {
      await storage.increment(KEY, ttl, limit, ttl, THROTTLER_NAME);
    }
    const blocked = await storage.increment(
      KEY,
      ttl,
      limit,
      ttl,
      THROTTLER_NAME,
    );
    expect(blocked.isBlocked).toBe(true);

    // One millisecond past the block window — the exact boundary condition.
    jest.spyOn(Date, 'now').mockReturnValue(start + ttl + 1);

    const afterTtl = await storage.increment(
      KEY,
      ttl,
      limit,
      ttl,
      THROTTLER_NAME,
    );
    expect(afterTtl.isBlocked).toBe(false);
    expect(afterTtl.totalHits).toBe(1);
  });

  it('still reports blocked one millisecond before the block window elapses', async () => {
    storage = new ThrottlerStorageService();
    const start = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(start);

    for (let i = 0; i <= limit; i++) {
      await storage.increment(KEY, ttl, limit, ttl, THROTTLER_NAME);
    }

    jest.spyOn(Date, 'now').mockReturnValue(start + ttl - 1);

    const stillBlocked = await storage.increment(
      KEY,
      ttl,
      limit,
      ttl,
      THROTTLER_NAME,
    );
    expect(stillBlocked.isBlocked).toBe(true);
  });
});
