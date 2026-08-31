import { createMobileAuthenticationSession } from './create-mobile-authentication-session';

describe('createMobileAuthenticationSession', () => {
  it('returns an opaque credential once and stores only its digest with approved lifetimes', async () => {
    const now = new Date('2026-08-31T12:00:00.000Z');
    const storeSession = jest.fn().mockResolvedValue(undefined);

    await expect(
      createMobileAuthenticationSession('account-id', {
        issueCredential: () => ({
          secret: 'opaque-session-credential',
          digest: Buffer.from('credential-digest'),
        }),
        newId: () => 'authentication-session-id',
        now: () => now,
        storeSession,
      }),
    ).resolves.toEqual({ credential: 'opaque-session-credential' });
    expect(storeSession).toHaveBeenCalledWith({
      id: 'authentication-session-id',
      accountId: 'account-id',
      surface: 'mobile',
      credentialDigest: Buffer.from('credential-digest'),
      createdAt: now,
      lastMeaningfulActivityAt: now,
      idleExpiresAt: new Date('2026-09-30T12:00:00.000Z'),
      absoluteExpiresAt: new Date('2026-11-29T12:00:00.000Z'),
    });
  });
});
