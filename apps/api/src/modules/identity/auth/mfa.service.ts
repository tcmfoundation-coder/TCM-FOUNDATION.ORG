import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verify } from 'otplib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { MFA_LOCKOUT_MS, MFA_MAX_FAILED_ATTEMPTS } from './auth.constants';

const ALGORITHM = 'aes-256-gcm';
const ISSUER = 'TCM Foundation';

// TOTP secrets are the one credential that, if leaked from the database,
// would let an attacker generate valid MFA codes — so they're encrypted at
// rest with MFA_ENCRYPTION_KEY (never the plaintext secret), separately
// from password hashing (argon2, one-way) which protects a different
// threat (password reuse), not decryptable by design.
@Injectable()
export class MfaService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // Shared brute-force guard for both TOTP checkpoints (login-verify and
  // enrollment-verify check the same per-account secret). Throws the same
  // generic message a wrong code would produce — a locked account must not
  // be distinguishable from "just try again."
  assertNotLocked(user: { mfaLockedUntil: Date | null }): void {
    if (user.mfaLockedUntil && user.mfaLockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Too many failed attempts. Try again later.',
      );
    }
  }

  async registerFailedAttempt(userId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { mfaFailedAttempts: { increment: 1 } },
      select: { mfaFailedAttempts: true },
    });

    if (user.mfaFailedAttempts >= MFA_MAX_FAILED_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          mfaFailedAttempts: 0,
          mfaLockedUntil: new Date(Date.now() + MFA_LOCKOUT_MS),
        },
      });
    }
  }

  async registerSuccess(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaFailedAttempts: 0, mfaLockedUntil: null },
    });
  }

  private getKey(): Buffer {
    return Buffer.from(
      this.config.getOrThrow<string>('MFA_ENCRYPTION_KEY'),
      'hex',
    );
  }

  generateSecret(): string {
    return generateSecret();
  }

  buildOtpAuthUri(email: string, secret: string): string {
    return generateURI({ issuer: ISSUER, label: email, secret });
  }

  async verifyCode(code: string, secret: string): Promise<boolean> {
    try {
      const result = await verify({ token: code, secret });
      return result.valid;
    } catch {
      return false;
    }
  }

  encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.getKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      ciphertext.toString('hex'),
    ].join(':');
  }

  decryptSecret(encrypted: string): string {
    const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':');
    const decipher = createDecipheriv(
      ALGORITHM,
      this.getKey(),
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, 'hex')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
