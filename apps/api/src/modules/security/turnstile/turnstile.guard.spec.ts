import {
  BadRequestException,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';
import type { TurnstileOutcome, TurnstileService } from './turnstile.service';

describe('TurnstileGuard', () => {
  function contextWithBody(body: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ body, ip: '203.0.113.4' }),
      }),
    } as unknown as ExecutionContext;
  }

  function guardReturning(outcome: TurnstileOutcome) {
    // Held as a standalone mock so assertions reference it directly rather
    // than through the service object (which would be an unbound method).
    const verify = jest.fn().mockResolvedValue(outcome);
    const turnstile = {
      verify,
      isEnabled: jest.fn(),
    } as unknown as TurnstileService;
    return { guard: new TurnstileGuard(turnstile), verify };
  }

  it('allows the request through when verification is skipped (unconfigured)', async () => {
    const { guard } = guardReturning({ status: 'skipped' });
    await expect(guard.canActivate(contextWithBody({}))).resolves.toBe(true);
  });

  it('allows the request through on a valid token', async () => {
    const { guard } = guardReturning({ status: 'valid' });
    await expect(
      guard.canActivate(contextWithBody({ turnstileToken: 'good' })),
    ).resolves.toBe(true);
  });

  it('rejects a missing token with a 400', async () => {
    const { guard } = guardReturning({ status: 'missing-token' });
    await expect(guard.canActivate(contextWithBody({}))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid token with a 400', async () => {
    const { guard } = guardReturning({ status: 'invalid', codes: ['bad'] });
    await expect(
      guard.canActivate(contextWithBody({ turnstileToken: 'bad' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails closed with a 503 when the provider is unreachable', async () => {
    const { guard } = guardReturning({
      status: 'unavailable',
      reason: 'timed out',
    });
    await expect(
      guard.canActivate(contextWithBody({ turnstileToken: 'token' })),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('passes the caller IP through for verification', async () => {
    const { guard, verify } = guardReturning({ status: 'valid' });
    await guard.canActivate(contextWithBody({ turnstileToken: 'good' }));
    expect(verify).toHaveBeenCalledWith('good', '203.0.113.4');
  });

  it('tolerates a request with no body at all', async () => {
    const { guard } = guardReturning({ status: 'skipped' });
    await expect(guard.canActivate(contextWithBody(undefined))).resolves.toBe(
      true,
    );
  });
});
