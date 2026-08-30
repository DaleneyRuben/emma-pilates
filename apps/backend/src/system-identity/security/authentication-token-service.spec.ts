import { AuthenticationTokenService } from './authentication-token-service';

describe('AuthenticationTokenService', () => {
  it('issues distinct high-entropy secrets and stores only their digests', () => {
    const tokens = new AuthenticationTokenService();

    const first = tokens.issue();
    const second = tokens.issue();

    expect(first.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.digest).toHaveLength(32);
    expect(first.digest.toString('utf8')).not.toContain(first.secret);
    expect(second.secret).not.toBe(first.secret);
    expect(tokens.digest(first.secret)).toEqual(first.digest);
    expect(tokens.matches(first.secret, first.digest)).toBe(true);
    expect(tokens.matches(second.secret, first.digest)).toBe(false);
  });
});
