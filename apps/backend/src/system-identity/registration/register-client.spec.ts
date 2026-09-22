import { RegisterClient } from './register-client';

describe('RegisterClient', () => {
  it('creates a pending Client Account and queues its encrypted Verification Link', async () => {
    const now = new Date('2026-08-30T18:00:00.000Z');
    const transaction = {
      findAccountByEmail: jest.fn().mockResolvedValue(null),
      canIssueAuthenticationEmail: jest.fn().mockResolvedValue(true),
      recordIssuedAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
      createSelfRegistration: jest.fn().mockResolvedValue(undefined),
      replaceSelfRegistrationVerification: jest.fn(),
      replaceStaffInvitationActivation: jest.fn(),
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
        referralCode: ' ref-lucia ',
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
      referredByCode: 'REF-LUCIA',
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
    expect(transaction.recordIssuedAuthenticationEmail).toHaveBeenCalledWith({
      email: 'ana@example.com',
      purpose: 'verification',
      occurredAt: now,
    });
  });

  it('reuses a self-registered Pending Account without granting its continuation', async () => {
    const now = new Date('2026-08-30T18:00:00.000Z');
    const transaction = {
      findAccountByEmail: jest.fn().mockResolvedValue({
        id: 'existing-account-id',
        domainIdentity: 'client',
        pendingFlow: 'self_registration',
      }),
      canIssueAuthenticationEmail: jest.fn().mockResolvedValue(true),
      recordIssuedAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
      createSelfRegistration: jest.fn(),
      replaceSelfRegistrationVerification: jest
        .fn()
        .mockResolvedValue(undefined),
      replaceStaffInvitationActivation: jest.fn(),
      scheduleAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
    };
    const issue = jest
      .fn()
      .mockReturnValueOnce({
        secret: 'new-verification-secret',
        digest: Buffer.from('new-verification-digest'),
      })
      .mockReturnValueOnce({
        secret: 'unused-continuation-secret',
        digest: Buffer.from('unused-continuation-digest'),
      })
      .mockReturnValueOnce({
        secret: 'decoy-continuation-secret',
        digest: Buffer.from('decoy-continuation-digest'),
      });
    const registerClient = new RegisterClient({
      unitOfWork: {
        execute: jest.fn(
          async (
            work: (activeTransaction: typeof transaction) => Promise<boolean>,
          ) => work(transaction),
        ),
      },
      passwordHasher: {
        hash: jest.fn().mockResolvedValue('unused-password-hash'),
      },
      tokenIssuer: { issue },
      linkCipher: {
        encrypt: jest.fn().mockReturnValue({
          encryptedLinkSecret: 'encrypted-new-verification-secret',
          encryptionKeyId: 'local-test-key',
        }),
      },
      now: () => now,
      newId: () => 'new-verification-token-id',
      newReferralCode: () => 'UNUSED-REFERRAL',
    });

    await expect(
      registerClient.execute({
        name: 'Replacement Name',
        email: 'ana@example.com',
        password: 'replacement password',
      }),
    ).resolves.toEqual({
      email: 'ana@example.com',
      registrationContinuation: 'decoy-continuation-secret',
    });
    expect(transaction.createSelfRegistration).not.toHaveBeenCalled();
    expect(
      transaction.replaceSelfRegistrationVerification,
    ).toHaveBeenCalledWith({
      accountId: 'existing-account-id',
      pendingExpiresAt: new Date('2026-09-06T18:00:00.000Z'),
      verificationToken: {
        id: 'new-verification-token-id',
        digest: Buffer.from('new-verification-digest'),
        expiresAt: new Date('2026-08-31T18:00:00.000Z'),
      },
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith({
      version: 1,
      accountId: 'existing-account-id',
      authenticationTokenId: 'new-verification-token-id',
      purpose: 'verification',
      encryptedLinkSecret: 'encrypted-new-verification-secret',
      encryptionKeyId: 'local-test-key',
    });
  });

  it('keeps an Assistant-created Client on its Activation Link flow', async () => {
    const now = new Date('2026-08-30T18:00:00.000Z');
    const transaction = {
      findAccountByEmail: jest.fn().mockResolvedValue({
        id: 'invited-client-account-id',
        domainIdentity: 'client',
        pendingFlow: 'staff_invitation',
      }),
      canIssueAuthenticationEmail: jest.fn().mockResolvedValue(true),
      recordIssuedAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
      createSelfRegistration: jest.fn(),
      replaceSelfRegistrationVerification: jest.fn(),
      replaceStaffInvitationActivation: jest.fn().mockResolvedValue(undefined),
      scheduleAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
    };
    const issue = jest
      .fn()
      .mockReturnValueOnce({
        secret: 'new-activation-secret',
        digest: Buffer.from('new-activation-digest'),
      })
      .mockReturnValueOnce({
        secret: 'unused-continuation-secret',
        digest: Buffer.from('unused-continuation-digest'),
      })
      .mockReturnValueOnce({
        secret: 'decoy-continuation-secret',
        digest: Buffer.from('decoy-continuation-digest'),
      });
    const registerClient = new RegisterClient({
      unitOfWork: {
        execute: jest.fn(
          async (
            work: (activeTransaction: typeof transaction) => Promise<boolean>,
          ) => work(transaction),
        ),
      },
      passwordHasher: {
        hash: jest.fn().mockResolvedValue('unused-password-hash'),
      },
      tokenIssuer: { issue },
      linkCipher: {
        encrypt: jest.fn().mockReturnValue({
          encryptedLinkSecret: 'encrypted-new-activation-secret',
          encryptionKeyId: 'local-test-key',
        }),
      },
      now: () => now,
      newId: () => 'new-activation-token-id',
      newReferralCode: () => 'UNUSED-REFERRAL',
    });

    await expect(
      registerClient.execute({
        name: 'Replacement Name',
        email: 'invited@example.com',
        password: 'ignored public password',
      }),
    ).resolves.toEqual({
      email: 'invited@example.com',
      registrationContinuation: 'decoy-continuation-secret',
    });
    expect(transaction.createSelfRegistration).not.toHaveBeenCalled();
    expect(
      transaction.replaceSelfRegistrationVerification,
    ).not.toHaveBeenCalled();
    expect(transaction.replaceStaffInvitationActivation).toHaveBeenCalledWith({
      accountId: 'invited-client-account-id',
      pendingExpiresAt: new Date('2026-09-29T18:00:00.000Z'),
      activationToken: {
        id: 'new-activation-token-id',
        digest: Buffer.from('new-activation-digest'),
        expiresAt: new Date('2026-09-06T18:00:00.000Z'),
      },
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith({
      version: 1,
      accountId: 'invited-client-account-id',
      authenticationTokenId: 'new-activation-token-id',
      purpose: 'activation',
      encryptedLinkSecret: 'encrypted-new-activation-secret',
      encryptionKeyId: 'local-test-key',
    });
  });

  it('keeps the public response neutral when the recipient limit suppresses email', async () => {
    const transaction = {
      findAccountByEmail: jest.fn().mockResolvedValue(null),
      canIssueAuthenticationEmail: jest.fn().mockResolvedValue(false),
      recordIssuedAuthenticationEmail: jest.fn(),
      createSelfRegistration: jest.fn(),
      replaceSelfRegistrationVerification: jest.fn(),
      replaceStaffInvitationActivation: jest.fn(),
      scheduleAuthenticationEmail: jest.fn(),
    };
    const registerClient = new RegisterClient({
      unitOfWork: {
        execute: jest.fn(
          async (
            work: (activeTransaction: typeof transaction) => Promise<boolean>,
          ) => work(transaction),
        ),
      },
      passwordHasher: {
        hash: jest.fn().mockResolvedValue('unused-password-hash'),
      },
      tokenIssuer: {
        issue: jest
          .fn()
          .mockReturnValueOnce({
            secret: 'unused-verification-secret',
            digest: Buffer.from('unused-verification-digest'),
          })
          .mockReturnValueOnce({
            secret: 'unused-continuation-secret',
            digest: Buffer.from('unused-continuation-digest'),
          })
          .mockReturnValueOnce({
            secret: 'decoy-continuation-secret',
            digest: Buffer.from('decoy-continuation-digest'),
          }),
      },
      linkCipher: {
        encrypt: jest.fn().mockReturnValue({
          encryptedLinkSecret: 'unused-ciphertext',
          encryptionKeyId: 'local-test-key',
        }),
      },
      now: () => new Date('2026-08-30T18:00:00.000Z'),
      newId: () => 'unused-id',
      newReferralCode: () => 'UNUSED-REFERRAL',
    });

    await expect(
      registerClient.execute({
        name: 'Ana Pérez',
        email: 'ANA@example.com',
        password: 'correct horse battery staple',
      }),
    ).resolves.toEqual({
      email: 'ana@example.com',
      registrationContinuation: 'decoy-continuation-secret',
    });
    expect(transaction.canIssueAuthenticationEmail).toHaveBeenCalledWith({
      email: 'ana@example.com',
      purpose: 'verification',
      now: new Date('2026-08-30T18:00:00.000Z'),
    });
    expect(transaction.createSelfRegistration).not.toHaveBeenCalled();
    expect(transaction.recordIssuedAuthenticationEmail).not.toHaveBeenCalled();
    expect(transaction.scheduleAuthenticationEmail).not.toHaveBeenCalled();
  });
});
