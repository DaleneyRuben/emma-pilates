import { jest } from '@jest/globals';
import {
  completePasswordRecovery,
  requestPasswordRecovery,
  type PasswordRecoveryGateway,
} from './password-recovery';

describe('password recovery', () => {
  const now = new Date('2026-08-31T18:00:00.000Z');
  const gateway: jest.Mocked<PasswordRecoveryGateway> = {
    requestRecovery: jest.fn(),
    inspectRecoveryLink: jest.fn(),
    completeRecovery: jest.fn(),
  };
  const dependencies = {
    gateway,
    issueLinkToken: jest.fn(() => ({
      secret: 'recovery-secret',
      digest: Buffer.from('recovery-digest'),
    })),
    issueSessionCredential: jest.fn(() => ({
      secret: 'session-credential',
      digest: Buffer.from('session-digest'),
    })),
    digestToken: jest.fn(() => Buffer.from('recovery-digest')),
    encryptLinkSecret: jest.fn(() => ({
      encryptedLinkSecret: 'encrypted-recovery-secret',
      encryptionKeyId: 'local-key',
    })),
    hashPassword: jest.fn(async () => 'new-password-hash'),
    now: () => now,
    newTokenId: jest.fn(() => 'authentication-token-id'),
    newSessionId: jest.fn(() => 'authentication-session-id'),
    newAuditRecordId: jest.fn(() => 'audit-record-id'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the same accepted response when an email is unknown', async () => {
    gateway.requestRecovery.mockResolvedValue('unknown');

    await expect(
      requestPasswordRecovery({ email: ' Missing@Example.COM ' }, dependencies),
    ).resolves.toEqual({ status: 'accepted' });

    expect(gateway.requestRecovery).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'missing@example.com' }),
    );
  });

  it('issues a single-use recovery link with a thirty-minute lifetime', async () => {
    gateway.requestRecovery.mockResolvedValue('issued');

    await requestPasswordRecovery({ email: 'ana@example.com' }, dependencies);

    expect(gateway.requestRecovery).toHaveBeenCalledWith({
      email: 'ana@example.com',
      token: {
        id: 'authentication-token-id',
        digest: Buffer.from('recovery-digest'),
        expiresAt: new Date('2026-08-31T18:30:00.000Z'),
      },
      emailJob: {
        purpose: 'password_recovery',
        authenticationTokenId: 'authentication-token-id',
        encryptedLinkSecret: 'encrypted-recovery-secret',
        encryptionKeyId: 'local-key',
      },
      requestedAt: now,
    });
  });

  it('replaces the password, revokes all sessions, and returns one replacement session', async () => {
    gateway.inspectRecoveryLink.mockResolvedValue('current');
    gateway.completeRecovery.mockResolvedValue(undefined);

    await expect(
      completePasswordRecovery(
        { token: 'recovery-secret', password: 'new secure password' },
        dependencies,
      ),
    ).resolves.toEqual({
      status: 'recovered',
      credential: 'session-credential',
    });

    expect(gateway.completeRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: 'new-password-hash',
        completedAt: now,
        tokenDigest: Buffer.from('recovery-digest'),
        authenticationSession: expect.objectContaining({
          id: 'authentication-session-id',
          credentialDigest: Buffer.from('session-digest'),
        }),
      }),
    );
  });
});
