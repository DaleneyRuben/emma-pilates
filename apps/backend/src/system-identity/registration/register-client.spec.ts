import { RegisterClient } from './register-client';

describe('RegisterClient', () => {
  it('creates a pending Client Account and queues its encrypted Verification Link', async () => {
    const now = new Date('2026-08-30T18:00:00.000Z');
    const transaction = {
      findAccountByEmail: jest.fn().mockResolvedValue(null),
      createSelfRegistration: jest.fn().mockResolvedValue(undefined),
      scheduleAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
    };
    const unitOfWork = {
      execute: jest.fn(
        async (
          work: (activeTransaction: typeof transaction) => Promise<boolean>,
        ) => work(transaction),
      ),
    };
    const issue = jest
      .fn()
      .mockReturnValueOnce({
        secret: 'verification-secret',
        digest: Buffer.from('verification-digest'),
      })
      .mockReturnValueOnce({
        secret: 'continuation-secret',
        digest: Buffer.from('continuation-digest'),
      })
      .mockReturnValueOnce({
        secret: 'decoy-secret',
        digest: Buffer.from('decoy-digest'),
      });
    const registerClient = new RegisterClient({
      unitOfWork,
      passwordHasher: {
        hash: jest.fn().mockResolvedValue('argon2id-password-hash'),
      },
      tokenIssuer: { issue },
      linkCipher: {
        encrypt: jest.fn().mockReturnValue({
          encryptedLinkSecret: 'encrypted-verification-secret',
          encryptionKeyId: 'local-test-key',
        }),
      },
      now: () => now,
      newId: jest
        .fn()
        .mockReturnValueOnce('account-id')
        .mockReturnValueOnce('client-id')
        .mockReturnValueOnce('verification-token-id')
        .mockReturnValueOnce('continuation-token-id'),
      newReferralCode: () => 'ANA-REFERRAL',
    });

    await expect(
      registerClient.execute({
        name: '  Ana Pérez  ',
        email: '  ANA@Example.COM ',
        password: 'correct horse battery staple',
      }),
    ).resolves.toEqual({
      email: 'ana@example.com',
      registrationContinuation: 'continuation-secret',
    });
    expect(transaction.createSelfRegistration).toHaveBeenCalledWith({
      accountId: 'account-id',
      clientId: 'client-id',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      passwordHash: 'argon2id-password-hash',
      referralCode: 'ANA-REFERRAL',
      pendingExpiresAt: new Date('2026-09-06T18:00:00.000Z'),
      verificationToken: {
        id: 'verification-token-id',
        digest: Buffer.from('verification-digest'),
        expiresAt: new Date('2026-08-31T18:00:00.000Z'),
      },
      continuationToken: {
        id: 'continuation-token-id',
        digest: Buffer.from('continuation-digest'),
        expiresAt: new Date('2026-09-06T18:00:00.000Z'),
      },
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith({
      version: 1,
      accountId: 'account-id',
      authenticationTokenId: 'verification-token-id',
      purpose: 'verification',
      encryptedLinkSecret: 'encrypted-verification-secret',
      encryptionKeyId: 'local-test-key',
    });
  });
});
