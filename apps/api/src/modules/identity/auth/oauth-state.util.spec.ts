import { generateOAuthState, verifyOAuthState } from './oauth-state.util';

const SECRET = 'test-session-cookie-secret';
const OTHER_SECRET = 'a-different-secret';

describe('oauth-state.util', () => {
  it('accepts a freshly generated state presented back as both cookie and query value', () => {
    const state = generateOAuthState(SECRET);
    expect(verifyOAuthState(state, state, SECRET)).toBe(true);
  });

  it('rejects when the cookie is missing (no CSRF cookie set)', () => {
    const state = generateOAuthState(SECRET);
    expect(verifyOAuthState(undefined, state, SECRET)).toBe(false);
  });

  it('rejects when the query state is missing (callback hit without a state param)', () => {
    const state = generateOAuthState(SECRET);
    expect(verifyOAuthState(state, undefined, SECRET)).toBe(false);
  });

  it('rejects when the query state does not match the cookie (forged/mismatched state)', () => {
    const cookieState = generateOAuthState(SECRET);
    const attackerState = generateOAuthState(SECRET);
    expect(verifyOAuthState(cookieState, attackerState, SECRET)).toBe(false);
  });

  it('rejects a state whose signature does not verify (tampered payload)', () => {
    const state = generateOAuthState(SECRET);
    const [nonce, issuedAt] = state.split('.');
    const tampered = `${nonce}.${issuedAt}.not-the-real-signature`;
    expect(verifyOAuthState(tampered, tampered, SECRET)).toBe(false);
  });

  it('rejects a well-formed state signed with a different secret', () => {
    const state = generateOAuthState(OTHER_SECRET);
    expect(verifyOAuthState(state, state, SECRET)).toBe(false);
  });

  it('rejects an expired state (issued outside the TTL window)', () => {
    const now = Date.now();
    try {
      jest.useFakeTimers().setSystemTime(now);
      const state = generateOAuthState(SECRET);
      jest.setSystemTime(now + 11 * 60 * 1000); // 11 minutes later, TTL is 10
      expect(verifyOAuthState(state, state, SECRET)).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('accepts a state still inside the TTL window', () => {
    const now = Date.now();
    try {
      jest.useFakeTimers().setSystemTime(now);
      const state = generateOAuthState(SECRET);
      jest.setSystemTime(now + 9 * 60 * 1000); // 9 minutes later, still under 10
      expect(verifyOAuthState(state, state, SECRET)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects a malformed state value', () => {
    expect(
      verifyOAuthState(
        'not-three-dot-separated-parts',
        'not-three-dot-separated-parts',
        SECRET,
      ),
    ).toBe(false);
  });

  it('two states generated back-to-back are never identical (replay across sessions is not possible via guessing)', () => {
    const a = generateOAuthState(SECRET);
    const b = generateOAuthState(SECRET);
    expect(a).not.toBe(b);
  });
});
