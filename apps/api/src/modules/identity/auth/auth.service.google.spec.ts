import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { GoogleProfile } from './strategies/google.strategy';

type MockUser = {
  id: string;
  email: string;
  googleId: string | null;
  mfaEnabled: boolean;
  deactivatedAt: Date | null;
};

/**
 * AuthService.loginWithGoogle is where every account-linking/MFA/deactivation
 * decision for Google sign-in actually lives — GoogleOAuthCallbackGuard (see
 * its own specs) only validates the CSRF state before Passport ever exchanges
 * a code with Google. This is the layer the OAuth audit's checklist items
 * about account linking, MFA bypass, and deactivated users are really about,
 * and it was previously untested at this level.
 */
describe('AuthService.loginWithGoogle', () => {
  const profile: GoogleProfile = {
    googleId: 'g-123',
    email: 'staff@example.test',
  };

  let users: Map<string, MockUser>;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let tokens: {
    signMfaPendingToken: jest.Mock;
    signAccessToken: jest.Mock;
    issueRefreshToken: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };
  let auth: AuthService;

  function seedUser(overrides: Partial<MockUser> = {}): MockUser {
    const user: MockUser = {
      id: 'user-1',
      email: profile.email,
      googleId: null,
      mfaEnabled: false,
      deactivatedAt: null,
      ...overrides,
    };
    users.set(user.id, user);
    return user;
  }

  beforeEach(() => {
    users = new Map();
    prisma = {
      user: {
        findUnique: jest.fn(
          ({ where }: { where: { googleId: string } | { email: string } }) => {
            const match = [...users.values()].find((u) =>
              'googleId' in where
                ? u.googleId === where.googleId
                : u.email === where.email,
            );
            return Promise.resolve(match ?? null);
          },
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<MockUser>;
          }) => {
            const user = users.get(where.id)!;
            Object.assign(user, data);
            return Promise.resolve(user);
          },
        ),
      },
    };
    tokens = {
      signMfaPendingToken: jest.fn(() => 'mfa-pending-token'),
      signAccessToken: jest.fn(() => 'access-token'),
      issueRefreshToken: jest.fn(() => Promise.resolve('refresh-token')),
    };
    audit = { record: jest.fn() };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };

    auth = new AuthService(
      prisma as never,
      tokens as never,
      {} as never, // MfaService — not reached by loginWithGoogle itself
      { get: () => undefined } as never,
      audit as never,
      {} as never, // MailService — not reached
    );
  });

  it('rejects a Google identity with no matching account at all — never auto-provisions', async () => {
    await expect(auth.loginWithGoogle(profile, res as never)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(res.cookie).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('logs in directly when googleId is already linked', async () => {
    seedUser({ googleId: profile.googleId });

    const result = await auth.loginWithGoogle(profile, res as never);

    expect(result.mfaRequired).toBe(false);
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-token',
      expect.any(Object),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.any(Object),
    );
  });

  it('links googleId to an existing password account matched by email, on first Google sign-in', async () => {
    const user = seedUser(); // no googleId yet

    await auth.loginWithGoogle(profile, res as never);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { googleId: profile.googleId },
    });
  });

  it('rejects — and does NOT link — a deactivated account matched only by email', async () => {
    const user = seedUser({ deactivatedAt: new Date() });

    await expect(auth.loginWithGoogle(profile, res as never)).rejects.toThrow(
      UnauthorizedException,
    );

    // The whole point: deactivation must not be undoable by linking a fresh
    // Google identity onto the retired account.
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(user.googleId).toBeNull();
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('rejects a deactivated account that already has googleId linked', async () => {
    seedUser({ googleId: profile.googleId, deactivatedAt: new Date() });

    await expect(auth.loginWithGoogle(profile, res as never)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('does not bypass MFA: an MFA-enabled account gets a pending challenge, not a session', async () => {
    seedUser({ googleId: profile.googleId, mfaEnabled: true });

    const result = await auth.loginWithGoogle(profile, res as never);

    expect(result.mfaRequired).toBe(true);
    expect(res.cookie).toHaveBeenCalledWith(
      'mfa_pending_token',
      'mfa-pending-token',
      expect.any(Object),
    );
    // No access/refresh cookie — a real session must wait for the TOTP step.
    expect(res.cookie).not.toHaveBeenCalledWith(
      'access_token',
      expect.anything(),
      expect.anything(),
    );
    expect(res.cookie).not.toHaveBeenCalledWith(
      'refresh_token',
      expect.anything(),
      expect.anything(),
    );
  });

  it('records ADMIN_LOGIN_SUCCEEDED with method: google on a successful non-MFA login', async () => {
    seedUser({ googleId: profile.googleId });

    await auth.loginWithGoogle(profile, res as never);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_LOGIN_SUCCEEDED',
        after: { method: 'google' },
      }),
    );
  });

  it('records ADMIN_LOGIN_FAILED for an unprovisioned Google account, without leaking whether the email exists', async () => {
    await expect(auth.loginWithGoogle(profile, res as never)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_LOGIN_FAILED' }),
    );
  });
});
