import { authenticationTokens } from './authentication-token-service';

describe('authentication tokens', () => {
  it('issues distinct high-entropy secrets and stores only their digests', () => {
    const first = authenticationTokens.issue();
    const second = authenticationTokens.issue();

    expect(first.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.digest).toHaveLength(32);
    expect(first.digest.toString('utf8')).not.toContain(first.secret);
    expect(second.secret).not.toBe(first.secret);
    expect(authenticationTokens.digest(first.secret)).toEqual(first.digest);
    expect(authenticationTokens.matches(first.secret, first.digest)).toBe(true);
    expect(authenticationTokens.matches(second.secret, first.digest)).toBe(
      false,
    );
  });
});
