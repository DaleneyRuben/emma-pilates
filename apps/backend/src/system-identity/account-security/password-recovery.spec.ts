import { jest } from '@jest/globals';
import { AuthenticationLinkStateChangedError } from './authentication-links';
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
    hashPassword: jest.fn(() => Promise.resolve('new-password-hash')),
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

    expect(gateway.requestRecovery.mock.calls[0]?.[0]).toMatchObject({
      email: 'missing@example.com',
    });
  });

  it('issues a single-use recovery link with a thirty-minute lifetime', async () => {
    gateway.requestRecovery.mockResolvedValue('issued');

    await requestPasswordRecovery({ email: 'ana@example.com' }, dependencies);

    expect(gateway.requestRecovery.mock.calls[0]?.[0]).toEqual({
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

  it('answers expired when the link was used while the password was hashed', async () => {
    gateway.inspectRecoveryLink.mockResolvedValue('current');
    gateway.completeRecovery.mockRejectedValue(
      new AuthenticationLinkStateChangedError(),
    );

    await expect(
      completePasswordRecovery(
        { token: 'recovery-secret', password: 'new secure password' },
        dependencies,
      ),
    ).resolves.toEqual({ status: 'expired' });
  });

  it('replaces the password, revokes all sessions, and returns one replacement session', async () => {
    gateway.inspectRecoveryLink.mockResolvedValue('current');
    gateway.completeRecovery.mockResolvedValue({ sessionOpened: true });

    await expect(
      completePasswordRecovery(
        { token: 'recovery-secret', password: 'new secure password' },
        dependencies,
      ),
    ).resolves.toEqual({
      status: 'recovered',
      credential: 'session-credential',
    });

    expect(gateway.completeRecovery.mock.calls[0]?.[0]).toMatchObject({
      passwordHash: 'new-password-hash',
      completedAt: now,
      tokenDigest: Buffer.from('recovery-digest'),
      authenticationSession: {
        id: 'authentication-session-id',
        surface: 'mobile',
        credentialDigest: Buffer.from('session-digest'),
      },
      sessionEligibility: 'any',
    });
  });

  describe('from the admin web', () => {
    it('opens the replacement browser session with the Administrator lifetimes', async () => {
      gateway.inspectRecoveryLink.mockResolvedValue('current');
      gateway.completeRecovery.mockResolvedValue({ sessionOpened: true });

      await expect(
        completePasswordRecovery(
          { token: 'recovery-secret', password: 'new secure password' },
          dependencies,
          'admin_web',
        ),
      ).resolves.toEqual({
        status: 'recovered',
        credential: 'session-credential',
      });
      expect(gateway.completeRecovery.mock.calls[0]?.[0]).toMatchObject({
        authenticationSession: {
          surface: 'admin_web',
          idleExpiresAt: new Date('2026-08-31T18:30:00.000Z'),
          absoluteExpiresAt: new Date('2026-09-01T06:00:00.000Z'),
        },
        sessionEligibility: 'admin_web',
      });
    });

    it('replaces the password but opens no browser session for an Account that is not an Administrator', async () => {
      gateway.inspectRecoveryLink.mockResolvedValue('current');
      gateway.completeRecovery.mockResolvedValue({ sessionOpened: false });

      await expect(
        completePasswordRecovery(
          { token: 'recovery-secret', password: 'new secure password' },
          dependencies,
          'admin_web',
        ),
      ).resolves.toEqual({ status: 'recovered' });
    });
  });
});
