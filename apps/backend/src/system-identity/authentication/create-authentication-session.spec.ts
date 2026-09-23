import { createAuthenticationSession } from './create-authentication-session';

describe('createAuthenticationSession', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');
  const dependencies = (storeSession: jest.Mock) => ({
    issueCredential: () => ({
      secret: 'opaque-session-credential',
      digest: Buffer.from('credential-digest'),
    }),
    newId: () => 'authentication-session-id',
    now: () => now,
    storeSession,
  });

  it('gives an admin-web session the 30-minute idle and 12-hour absolute Administrator lifetimes', async () => {
    const storeSession = jest.fn().mockResolvedValue(undefined);

    await expect(
      createAuthenticationSession(
        'account-id',
        'admin_web',
        dependencies(storeSession),
      ),
    ).resolves.toEqual({ credential: 'opaque-session-credential' });
    expect(storeSession).toHaveBeenCalledWith({
      id: 'authentication-session-id',
      accountId: 'account-id',
      surface: 'admin_web',
      credentialDigest: Buffer.from('credential-digest'),
      createdAt: now,
      lastMeaningfulActivityAt: now,
      idleExpiresAt: new Date('2026-08-31T12:30:00.000Z'),
      absoluteExpiresAt: new Date('2026-09-01T00:00:00.000Z'),
    });
  });

  it('keeps the 30-day idle and 90-day absolute mobile lifetimes', async () => {
    const storeSession = jest.fn().mockResolvedValue(undefined);

    await createAuthenticationSession(
      'account-id',
      'mobile',
      dependencies(storeSession),
    );

    expect(storeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: 'mobile',
        idleExpiresAt: new Date('2026-09-30T12:00:00.000Z'),
        absoluteExpiresAt: new Date('2026-11-29T12:00:00.000Z'),
      }),
    );
  });
});
