import { TurnstileService } from './turnstile.service';

describe('TurnstileService', () => {
  const originalFetch = global.fetch;

  function serviceWithSecret(secret?: string) {
    const config = { get: jest.fn().mockReturnValue(secret) };
    return new TurnstileService(config as never);
  }

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('when no secret is configured', () => {
    it('reports itself disabled', () => {
      expect(serviceWithSecret(undefined).isEnabled()).toBe(false);
    });

    it('skips verification rather than blocking the request', async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as never;

      await expect(
        serviceWithSecret(undefined).verify('anything'),
      ).resolves.toEqual({
        status: 'skipped',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('when a secret is configured', () => {
    it('reports a missing token without calling the provider', async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as never;

      await expect(
        serviceWithSecret('secret').verify(undefined),
      ).resolves.toEqual({
        status: 'missing-token',
      });
      await expect(serviceWithSecret('secret').verify('   ')).resolves.toEqual({
        status: 'missing-token',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('accepts a token the provider confirms', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }) as never;

      await expect(
        serviceWithSecret('secret').verify('good-token'),
      ).resolves.toEqual({
        status: 'valid',
      });
    });

    it('rejects a token the provider refuses, surfacing its error codes', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            'error-codes': ['invalid-input-response'],
          }),
      }) as never;

      await expect(
        serviceWithSecret('secret').verify('bad-token'),
      ).resolves.toEqual({
        status: 'invalid',
        codes: ['invalid-input-response'],
      });
    });

    it('reports unavailable when the provider times out', async () => {
      const timeout = Object.assign(new Error('timed out'), {
        name: 'TimeoutError',
      });
      global.fetch = jest.fn().mockRejectedValue(timeout) as never;

      await expect(
        serviceWithSecret('secret').verify('token'),
      ).resolves.toEqual({
        status: 'unavailable',
        reason: 'timed out',
      });
    });

    it('reports unavailable on a network error', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('ECONNREFUSED')) as never;

      await expect(
        serviceWithSecret('secret').verify('token'),
      ).resolves.toEqual({
        status: 'unavailable',
        reason: 'network error',
      });
    });

    it('reports unavailable on a non-OK HTTP response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }) as never;

      await expect(
        serviceWithSecret('secret').verify('token'),
      ).resolves.toEqual({
        status: 'unavailable',
        reason: 'HTTP 500',
      });
    });

    it('never puts the secret or token in the query string', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      global.fetch = fetchSpy as never;

      await serviceWithSecret('top-secret').verify('token', '203.0.113.4');

      // The service always sends form-encoded URLSearchParams, so the body is
      // narrowed to that rather than RequestInit's broad union.
      const [url, init] = fetchSpy.mock.calls[0] as [
        string,
        { method: string; body: URLSearchParams },
      ];
      expect(url).not.toContain('top-secret');
      expect(url).not.toContain('token');
      expect(init.method).toBe('POST');
      // Credentials travel in the form-encoded body, not the URL.
      expect(init.body.get('secret')).toBe('top-secret');
      expect(init.body.get('response')).toBe('token');
      expect(init.body.get('remoteip')).toBe('203.0.113.4');
    });
  });
});
