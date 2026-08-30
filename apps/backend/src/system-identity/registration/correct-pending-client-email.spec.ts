import { CorrectPendingClientEmail } from './correct-pending-client-email';

describe('CorrectPendingClientEmail', () => {
  it('replaces the Verification Link and restarts the pending registration window', async () => {
    const now = new Date('2026-08-30T19:00:00.000Z');
    const correctEmail = jest.fn().mockResolvedValue('corrected');
    const tokens = {
      digest: jest.fn().mockReturnValue(Buffer.from('continuation-digest')),
      issue: jest.fn().mockReturnValue({
        secret: 'new-verification-secret',
        digest: Buffer.from('new-verification-digest'),
      }),
    };
    const useCase = new CorrectPendingClientEmail({
      gateway: { correctEmail },
      tokens,
      linkCipher: {
        encrypt: jest.fn().mockReturnValue({
          encryptedLinkSecret: 'encrypted-new-verification-secret',
          encryptionKeyId: 'local-test-key',
        }),
      },
      now: () => now,
      newId: () => 'new-verification-token-id',
    });

    await expect(
      useCase.execute({
        registrationContinuation: 'continuation-secret',
        email: ' NEW@Example.COM ',
      }),
    ).resolves.toEqual({ status: 'corrected', email: 'new@example.com' });
    expect(correctEmail).toHaveBeenCalledWith({
      continuationDigest: Buffer.from('continuation-digest'),
      email: 'new@example.com',
      now,
      pendingExpiresAt: new Date('2026-09-06T19:00:00.000Z'),
      verificationToken: {
        id: 'new-verification-token-id',
        digest: Buffer.from('new-verification-digest'),
        expiresAt: new Date('2026-08-31T19:00:00.000Z'),
      },
      emailJob: {
        version: 1,
        purpose: 'verification',
        authenticationTokenId: 'new-verification-token-id',
        encryptedLinkSecret: 'encrypted-new-verification-secret',
        encryptionKeyId: 'local-test-key',
      },
    });
  });
});
