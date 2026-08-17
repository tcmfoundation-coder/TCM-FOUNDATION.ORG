import { createHash, randomBytes } from 'crypto';

// Used for refresh tokens, email verification tokens, and password reset
// tokens: all are high-entropy random values, so a fast hash (sha256) is
// appropriate here — unlike passwords, there's no low-entropy brute-force
// risk to defend against with a slow hash (that's what argon2 is for).
export function generateRandomToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
