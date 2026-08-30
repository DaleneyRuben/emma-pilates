import { ResendPendingClientVerification } from './resend-pending-client-verification';

describe('ResendPendingClientVerification', () => {
  it('replaces the Verification Link and restarts the inactivity window', async () => {
    const now = new Date('2026-08-30T20:00:00.000Z');
    const resend = jest.fn().mockResolvedValue('sent');
    const useCase = new ResendPendingClientVerification({
      gateway: { resend },
      tokens: {
        digest: jest.fn().mockReturnValue(Buffer.from('continuation-digest')),
        issue: jest.fn().mockReturnValue({
          secret: 'new-verification-secret',
          digest: Buffer.from('new-verification-digest'),
        }),
      },
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
      useCase.execute({ registrationContinuation: 'continuation-secret' }),
    ).resolves.toEqual({ status: 'sent' });
    expect(resend).toHaveBeenCalledWith({
      continuationDigest: Buffer.from('continuation-digest'),
      now,
      pendingExpiresAt: new Date('2026-09-06T20:00:00.000Z'),
      verificationToken: {
        id: 'new-verification-token-id',
        digest: Buffer.from('new-verification-digest'),
        expiresAt: new Date('2026-08-31T20:00:00.000Z'),
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
