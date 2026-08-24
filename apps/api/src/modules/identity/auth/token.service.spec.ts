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

  it('rejects an IMMEDIATE replay of the just-rotated original token, not just a later one', async () => {
    // Matches the real e2e regression (test/auth.e2e-spec.ts): rotate once,
    // then replay the original token right away, in the same test — no
    // delay at all. An earlier version of this service tolerated exactly
    // this (mistaking the rotation's own successor for proof of a
    // legitimate concurrent caller) and let it through with a fresh pair.
    const original = await issueRealToken();
    const first = await tokens.rotateRefreshToken(original);

    await expect(tokens.rotateRefreshToken(original)).rejects.toThrow(
      UnauthorizedException,
    );

    // Reuse detection means business: the winner's own fresh token is dead too.
    await expect(tokens.rotateRefreshToken(first.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('treats reuse of an already-rotated token long after rotation as theft: revokes every session', async () => {
    const original = await issueRealToken();
    await tokens.rotateRefreshToken(original);

    const jti = jtiOf(original);
    refreshTokens.get(jti)!.revokedAt = new Date(Date.now() - 60_000);

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

  it('rejects a deactivated account presenting an otherwise-valid token', async () => {
    const original = await issueRealToken();
    userDeactivatedAt = new Date();

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
