import { logout } from './logout';

describe('logout', () => {
  it('revokes the Authentication Session that authorized the request', async () => {
    const revokedAt = new Date('2026-08-31T12:00:00.000Z');
    const revokeSession = jest.fn().mockResolvedValue(undefined);

    await logout('authentication-session-id', {
      now: () => revokedAt,
      revokeSession,
    });

    expect(revokeSession).toHaveBeenCalledWith({
      authenticationSessionId: 'authentication-session-id',
      revokedAt,
      reason: 'logout',
    });
  });
});
