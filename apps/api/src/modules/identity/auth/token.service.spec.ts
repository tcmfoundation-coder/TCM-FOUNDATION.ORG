import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { hashToken } from './crypto.util';

type RefreshTokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

type JwtPayload = { sub: string; type: string; jti?: string };

/**
 * Exercises TokenService.rotateRefreshToken directly (real logic, fake
 * dependencies) — the layer that both proxy.ts (server-side, on stale
 * /admin/* navigations) and api-client.ts (browser-side, single-flight) call
 * into for a transparent session refresh, and the one place refresh-token
 * reuse detection lives.
 *
 * JwtService is faked with a trivial reversible encoding rather than real
 * signing: these tests are about rotation/reuse-detection behaviour, not
 * JWT cryptography (which `jsonwebtoken` itself already covers).
 */
function fakeJwt() {
  return {
    sign: (payload: JwtPayload) => `signed:${JSON.stringify(payload)}`,
    verify: (token: string): JwtPayload => {
      if (!token.startsWith('signed:')) throw new Error('bad token');
      return JSON.parse(token.slice('signed:'.length)) as JwtPayload;
    },
  };
}

function jtiOf(token: string): string {
  return fakeJwt().verify(token).jti!;
}

describe('TokenService.rotateRefreshToken', () => {
  const userId = 'user-1';
  let refreshTokens: Map<string, RefreshTokenRow>;
  let userDeactivatedAt: Date | null;
  let prisma: {
    refreshToken: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };
  let tokens: TokenService;

  function issueRealToken(): Promise<string> {
    // Goes through the real signAccessToken/issueRefreshToken/rotate path so
    // each test starts from a token this same service instance considers
    // legitimately issued, not a hand-crafted fixture.
    return tokens.issueRefreshToken(userId);
  }

  beforeEach(() => {
    refreshTokens = new Map();
    userDeactivatedAt = null;

    prisma = {
      refreshToken: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(refreshTokens.get(where.id) ?? null),
        ),
        findFirst: jest.fn(
          ({
            where,
          }: {
            where: {
              userId: string;
              revokedAt: null;
              createdAt: { gte: Date; lte: Date };
            };
          }) => {
            for (const row of refreshTokens.values()) {
              if (row.userId !== where.userId) continue;
              if (row.revokedAt !== null) continue;
              if (
                row.createdAt < where.createdAt.gte ||
                row.createdAt > where.createdAt.lte
              )
                continue;
              return Promise.resolve(row);
            }
            return Promise.resolve(null);
          },
        ),
        create: jest.fn(
          ({
            data,
          }: {
            data: {
              id: string;
              userId: string;
              tokenHash: string;
              expiresAt: Date;
            };
          }) => {
            const row: RefreshTokenRow = {
              ...data,
              revokedAt: null,
              createdAt: new Date(),
            };
            refreshTokens.set(data.id, row);
            return Promise.resolve(row);
          },
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<RefreshTokenRow>;
          }) => {
            const row = refreshTokens.get(where.id);
            if (row) Object.assign(row, data);
            return Promise.resolve(row);
          },
        ),
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: { userId: string; revokedAt: null };
            data: Partial<RefreshTokenRow>;
          }) => {
            for (const row of refreshTokens.values()) {
              if (row.userId === where.userId && row.revokedAt === null) {
                Object.assign(row, data);
              }
            }
            return Promise.resolve({ count: 0 });
          },
        ),
      },
      user: {
        findUnique: jest.fn(() =>
          Promise.resolve({ deactivatedAt: userDeactivatedAt }),
        ),
      },
    };

    const config = { getOrThrow: (key: string) => `secret-${key}` };
    tokens = new TokenService(
      fakeJwt() as never,
      config as never,
      prisma as never,
    );
  });

  it('rotates a valid token: revokes the old one, issues a working new pair', async () => {
    const original = await issueRealToken();
    const result = await tokens.rotateRefreshToken(original);

    expect(result.userId).toBe(userId);
    expect(result.refreshToken).not.toBe(original);

    const originalRow = [...refreshTokens.values()].find(
      (r) => r.tokenHash === hashToken(original),
    );
    expect(originalRow?.revokedAt).not.toBeNull();

    // The newly-issued token itself still rotates cleanly.
    await expect(
      tokens.rotateRefreshToken(result.refreshToken),
    ).resolves.toMatchObject({ userId });
  });

  it('treats reuse of an already-rotated token LONG after rotation as theft: revokes every session', async () => {
    const original = await issueRealToken();
    const first = await tokens.rotateRefreshToken(original);

    // Simulate the rotation having happened well outside the grace window.
    refreshTokens.get(jtiOf(original))!.revokedAt = new Date(
      Date.now() - 60_000,
    );

    await expect(tokens.rotateRefreshToken(original)).rejects.toThrow(
      UnauthorizedException,
    );

    // The winner's own fresh token is now dead too — that's the whole point
    // of reuse detection: once reuse is suspected, nothing survives.
    await expect(tokens.rotateRefreshToken(first.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('does NOT tolerate a just-nuked token replayed within the grace window (nuke creates no successor)', async () => {
    const original = await issueRealToken();
    const winner = await tokens.rotateRefreshToken(original);

    // A separate reuse event nukes every session for the user — winner's
    // fresh token included — with no successor ever issued, unlike a normal
    // rotation. Re-presenting either token immediately afterward (well
    // inside the grace window) must still be rejected: this is exactly the
    // gap an earlier, time-only version of this check missed.
    await tokens.revokeAllForUser(userId);

    await expect(tokens.rotateRefreshToken(original)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(
      tokens.rotateRefreshToken(winner.refreshToken),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('tolerates the SAME token being re-presented within the grace window: issues a fresh pair instead of nuking the session', async () => {
    const original = await issueRealToken();
    const winner = await tokens.rotateRefreshToken(original);

    // The loser of the race presents the same original token moments later
    // (rotation above already set revokedAt to "now").
    const loser = await tokens.rotateRefreshToken(original);

    expect(loser.userId).toBe(userId);
    // The winner's session must still be completely intact — this is the
    // regression this test guards: before the grace window existed, this
    // second call would have called revokeAllForUser and killed `winner`.
    await expect(
      tokens.rotateRefreshToken(winner.refreshToken),
    ).resolves.toMatchObject({ userId });
  });

  it('still blocks a deactivated account inside the grace window', async () => {
    const original = await issueRealToken();
    await tokens.rotateRefreshToken(original);
    userDeactivatedAt = new Date();

    await expect(tokens.rotateRefreshToken(original)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token past its own expiry even when never rotated', async () => {
    const original = await issueRealToken();
    refreshTokens.get(jtiOf(original))!.expiresAt = new Date(Date.now() - 1000);

    await expect(tokens.rotateRefreshToken(original)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token with a valid signature but no matching stored row', async () => {
    await expect(
      tokens.rotateRefreshToken(
        'signed:{"sub":"x","type":"refresh","jti":"missing"}',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a malformed token', async () => {
    await expect(tokens.rotateRefreshToken('not-a-real-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
