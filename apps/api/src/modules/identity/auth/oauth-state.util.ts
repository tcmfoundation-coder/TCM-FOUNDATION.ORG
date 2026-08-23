import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// Stateless OAuth CSRF state, signed with SESSION_COOKIE_SECRET.
//
// Passport's `state: true` option needs `req.session` to stash the value
// between the initiate and callback requests, and this project deliberately
// runs without express-session (PassportModule.register({ session: false })
// in auth.module.ts) — cookies/JWTs are the only session mechanism. So the
// state itself carries its own integrity check (HMAC) and expiry (embedded
// timestamp) rather than relying on a server-side store.
//
// The actual CSRF defense isn't the signature — it's that the same value is
// ALSO set as an httpOnly cookie on the browser that started the flow
// (see GoogleOAuthGuard) and required to match the callback's `state` query
// param byte-for-byte (see GoogleOAuthCallbackGuard). An attacker can see a
// victim's `state` in a redirect URL but can never hold the matching cookie,
// which is what makes this a login-CSRF defense rather than just a
// well-formedness check.
const STATE_TTL_MS = 10 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function generateOAuthState(secret: string): string {
  const nonce = randomBytes(16).toString('base64url');
  const issuedAt = Date.now().toString();
  const payload = `${nonce}.${issuedAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

// Verifies that `queryState` (from the callback URL) is exactly the value
// this server handed out AND is still within its TTL. `cookieState` is
// trusted as the reference value since it never left the browser.
export function verifyOAuthState(
  cookieState: string | undefined,
  queryState: string | undefined,
  secret: string,
): boolean {
  if (!cookieState || !queryState || !safeEqual(cookieState, queryState)) {
    return false;
  }

  const parts = cookieState.split('.');
  if (parts.length !== 3) return false;
  const [nonce, issuedAtRaw, signature] = parts;
  const expectedSignature = sign(`${nonce}.${issuedAtRaw}`, secret);
  if (!safeEqual(signature, expectedSignature)) return false;

  const issuedAt = Number(issuedAtRaw);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt <= STATE_TTL_MS;
}
