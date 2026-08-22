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
