/**
 * Stricter throttle applied to the public, unauthenticated write endpoints
 * (contact, newsletter, Support Lab, application submissions) on top of the
 * global 100-requests-per-minute default in AppModule.
 *
 * 10 per 5 minutes per IP is far above any genuine visitor — a person sends
 * one contact message or one application, not ten — while cutting off bulk
 * submission runs. It is deliberately not tighter than this: TCM's audience
 * includes community groups who may apply from a single shared network
 * (office, campus, community centre), and those visitors must not be locked
 * out. Turnstile is the primary bot defence; this is depth behind it.
 *
 * Note this is an in-memory counter, so each running instance holds its own
 * tally. That is accurate for a single instance; a multi-instance deployment
 * would need a shared store to enforce one true limit.
 */
export const PUBLIC_WRITE_THROTTLE = {
  default: { limit: 10, ttl: 300_000 },
} as const;

/**
 * Credential submission: 10 attempts per 5 minutes.
 *
 * Sized against real use rather than an arbitrary round number. A person
 * mistyping a password needs three or four goes; ten leaves comfortable room
 * for that while cutting an online guessing attack from the global ceiling of
 * 100/minute to 2/minute - a fiftyfold reduction.
 *
 * Deliberately NOT tightened further, because @nestjs/throttler keys on IP and
 * the brief's own warning applies: an office, a school or a mobile carrier NAT
 * puts many legitimate admins behind one address, and a limit tuned for a
 * single attacker locks all of them out. The per-account defence lives
 * elsewhere and is unaffected by this: MFA already locks an individual account
 * after 5 bad codes for 15 minutes, which no amount of IP rotation avoids.
 *
 * So the two controls compose: this bounds how fast any one network can
 * guess, and the account lockout bounds how far anyone gets against one user.
 */
export const AUTH_ATTEMPT_THROTTLE = {
  default: { limit: 10, ttl: 300_000 },
} as const;

/**
 * Password-reset requests: 5 per 15 minutes.
 *
 * Stricter because each accepted request sends an email. Left loose, it is a
 * free way to have the platform mail-bomb an address it will happily send to,
 * and to burn Resend quota.
 */
export const PASSWORD_RESET_THROTTLE = {
  default: { limit: 5, ttl: 900_000 },
} as const;
