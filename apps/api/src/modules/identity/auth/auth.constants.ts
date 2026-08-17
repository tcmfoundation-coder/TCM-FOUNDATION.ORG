// Token lifetimes and cookie names in one place so every consumer
// (AuthService, guards, strategies) agrees on them.

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const MFA_PENDING_TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

// Shared by both TOTP checkpoints (login verify and enrollment verify) —
// they check the same per-account secret, so a lockout on one protects
// the other too.
export const MFA_MAX_FAILED_ATTEMPTS = 5;
export const MFA_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// How long a role assignment may sit unconfirmed (PENDING_MFA) before it's
// treated as EXPIRED and a Super Administrator must reassign it.
export const PENDING_ROLE_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export const COOKIE_NAMES = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  MFA_PENDING: 'mfa_pending_token',
} as const;
