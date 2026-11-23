import { createHash } from 'node:crypto';
import { LoginThrottledError } from '../authentication/login';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  BiometricKeyRejectedError,
  exchangeBiometricKey,
  issueBiometricKey,
  MissingInstallationError,
  revokeBiometricKey,
  type BiometricKeyDependencies,
  type StoredBiometricKey,
} from './biometric-keys';

const digest = (value: string) => createHash('sha256').update(value).digest();

describe('biometric keys', () => {
  const now = new Date('2026-11-23T12:00:00.000Z');
  const installation = 'installation-identifier-0001';
  const principal: AuthenticatedPrincipal = {
    accountId: 'account-id',
    authenticationSessionId: 'session-id',
    identity: { kind: 'client', clientId: 'client-id' },
  };
  const stored = (overrides: Partial<StoredBiometricKey> = {}) => ({
    id: 'key-id',
    accountId: 'account-id',
    installationIdDigest: Buffer.from(`signal:installation:${installation}`),
    unlockSecretDigest: digest('unlock-secret'),
    expiresAt: new Date('2027-01-01T00:00:00.000Z'),
    revokedAt: null,
    revocationReason: null,
    accountCanSignIn: true,
    ...overrides,
  });
  let issued: number;
  let ids: number;
  const createDependencies = () => {
    issued = 0;
    ids = 0;
    const gateway = {
      issue: jest.fn().mockResolvedValue(undefined),
      findByKeyDigest: jest
        .fn<Promise<StoredBiometricKey | null>, [Uint8Array]>()
        .mockResolvedValue(stored()),
      rotate: jest.fn().mockResolvedValue(true),
      revokeInstallation: jest.fn().mockResolvedValue(undefined),
      readThrottleEvents: jest.fn().mockResolvedValue({
        loginLaneFailures: [],
        clientFailures: [],
        networkFailures: [],
      }),
      recordFailedCredentialCheck: jest.fn().mockResolvedValue(undefined),
    };
    const dependencies: BiometricKeyDependencies = {
      gateway,
      digestSignal: (value) => Buffer.from(`signal:${value}`),
      tokens: {
        issue: () => {
          issued += 1;
          const secret = `secret-${issued}`;
          return { secret, digest: digest(secret) };
        },
        digest,
        matches: (secret, expected) =>
          digest(secret).equals(Buffer.from(expected)),
      },
      now: () => now,
      newId: () => {
        ids += 1;
        return `id-${ids}`;
      },
    };
    return { dependencies, gateway };
  };
  const exchange = {
    deviceKey: 'device-key',
    unlockSecret: 'unlock-secret',
    clientIdentifier: installation,
    networkAddress: '127.0.0.1',
  };

  describe('issueBiometricKey', () => {
    it('returns both secrets once and stores only their digests for this installation', async () => {
      const { dependencies, gateway } = createDependencies();

      await expect(
        issueBiometricKey(
          principal,
          { clientIdentifier: installation },
          dependencies,
        ),
      ).resolves.toEqual({ deviceKey: 'secret-1', unlockSecret: 'secret-2' });

      expect(gateway.issue).toHaveBeenCalledWith({
        key: {
          id: 'id-1',
          accountId: 'account-id',
          installationIdDigest: Buffer.from(
            `signal:installation:${installation}`,
          ),
          keyDigest: digest('secret-1'),
          unlockSecretDigest: digest('secret-2'),
          issuedAt: now,
          expiresAt: new Date('2027-02-21T12:00:00.000Z'),
        },
        actor: { accountId: 'account-id', role: null, impersonationId: null },
        auditRecordId: 'id-2',
      });
    });

    it('needs the installation it is bound to', async () => {
      const { dependencies, gateway } = createDependencies();

      await expect(
        issueBiometricKey(principal, { clientIdentifier: null }, dependencies),
      ).rejects.toBeInstanceOf(MissingInstallationError);
      expect(gateway.issue).not.toHaveBeenCalled();
    });
  });

  describe('exchangeBiometricKey', () => {
    it('opens a mobile session and rotates the key, keeping its unlock secret', async () => {
      const { dependencies, gateway } = createDependencies();

      await expect(
        exchangeBiometricKey(exchange, dependencies),
      ).resolves.toEqual({ credential: 'secret-2', deviceKey: 'secret-1' });

      expect(gateway.findByKeyDigest).toHaveBeenCalledWith(
        digest('device-key'),
      );
      expect(gateway.rotate).toHaveBeenCalledWith({
        previousKeyId: 'key-id',
        key: {
          id: 'id-1',
          accountId: 'account-id',
          installationIdDigest: Buffer.from(
            `signal:installation:${installation}`,
          ),
          keyDigest: digest('secret-1'),
          unlockSecretDigest: digest('unlock-secret'),
          issuedAt: now,
          expiresAt: new Date('2027-02-21T12:00:00.000Z'),
        },
        session: {
          id: 'id-2',
          accountId: 'account-id',
          surface: 'mobile',
          credentialDigest: digest('secret-2'),
          createdAt: now,
          lastMeaningfulActivityAt: now,
          idleExpiresAt: new Date('2026-12-23T12:00:00.000Z'),
          absoluteExpiresAt: new Date('2027-02-21T12:00:00.000Z'),
        },
      });
      expect(gateway.recordFailedCredentialCheck).not.toHaveBeenCalled();
    });

    it.each<
      [string, Partial<StoredBiometricKey> | null, Partial<typeof exchange>]
    >([
      ['an unknown key', null, {}],
      ['a wrong unlock secret', {}, { unlockSecret: 'other-secret' }],
      [
        'another installation',
        {},
        { clientIdentifier: 'installation-other-0002' },
      ],
      ['an expired key', { expiresAt: now }, {}],
      [
        'an Account that can no longer sign in',
        { accountCanSignIn: false },
        {},
      ],
      [
        'a key turned off',
        { revokedAt: now, revocationReason: 'turned_off' },
        {},
      ],
    ])('rejects %s and counts the failure', async (_case, row, command) => {
      const { dependencies, gateway } = createDependencies();
      gateway.findByKeyDigest.mockResolvedValue(
        row === null ? null : stored(row),
      );

      await expect(
        exchangeBiometricKey({ ...exchange, ...command }, dependencies),
      ).rejects.toBeInstanceOf(BiometricKeyRejectedError);

      expect(gateway.rotate).not.toHaveBeenCalled();
      expect(gateway.revokeInstallation).not.toHaveBeenCalled();
      expect(gateway.recordFailedCredentialCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          clientDigest: Buffer.from(
            `signal:client:${command.clientIdentifier ?? installation}`,
          ),
          networkDigest: Buffer.from('signal:network:127.0.0.1'),
          occurredAt: now,
        }),
      );
    });

    it('revokes every key of the installation when a rotated key comes back', async () => {
      const { dependencies, gateway } = createDependencies();
      gateway.findByKeyDigest.mockResolvedValue(
        stored({ revokedAt: now, revocationReason: 'rotated' }),
      );

      await expect(
        exchangeBiometricKey(exchange, dependencies),
      ).rejects.toBeInstanceOf(BiometricKeyRejectedError);

      expect(gateway.revokeInstallation).toHaveBeenCalledWith({
        accountId: 'account-id',
        installationIdDigest: Buffer.from(
          `signal:installation:${installation}`,
        ),
        revokedAt: now,
        reason: 'reuse_detected',
        auditRecordId: 'id-1',
      });
      expect(gateway.rotate).not.toHaveBeenCalled();
    });

    it('rejects a key another request rotated first', async () => {
      const { dependencies, gateway } = createDependencies();
      gateway.rotate.mockResolvedValue(false);

      await expect(
        exchangeBiometricKey(exchange, dependencies),
      ).rejects.toBeInstanceOf(BiometricKeyRejectedError);
    });

    it('refuses while the login throttle is active, before reading the key', async () => {
      const { dependencies, gateway } = createDependencies();
      gateway.readThrottleEvents.mockResolvedValue({
        loginLaneFailures: [],
        clientFailures: Array.from({ length: 6 }, () => now),
        networkFailures: [],
      });

      await expect(
        exchangeBiometricKey(exchange, dependencies),
      ).rejects.toBeInstanceOf(LoginThrottledError);
      expect(gateway.findByKeyDigest).not.toHaveBeenCalled();
    });

    it('needs the installation the key is bound to', async () => {
      const { dependencies, gateway } = createDependencies();

      await expect(
        exchangeBiometricKey(
          { ...exchange, clientIdentifier: null },
          dependencies,
        ),
      ).rejects.toBeInstanceOf(MissingInstallationError);
      expect(gateway.findByKeyDigest).not.toHaveBeenCalled();
    });
  });

  describe('revokeBiometricKey', () => {
    it('turns off every key of the installation the key belongs to', async () => {
      const { dependencies, gateway } = createDependencies();

      await revokeBiometricKey(
        { deviceKey: 'device-key', clientIdentifier: installation },
        dependencies,
      );

      expect(gateway.revokeInstallation).toHaveBeenCalledWith({
        accountId: 'account-id',
        installationIdDigest: Buffer.from(
          `signal:installation:${installation}`,
        ),
        revokedAt: now,
        reason: 'turned_off',
        auditRecordId: 'id-1',
      });
    });

    it.each([
      ['an unknown key', null, installation],
      ['another installation', stored(), 'installation-other-0002'],
    ])('does nothing for %s', async (_case, row, clientIdentifier) => {
      const { dependencies, gateway } = createDependencies();
      gateway.findByKeyDigest.mockResolvedValue(row);

      await revokeBiometricKey(
        { deviceKey: 'device-key', clientIdentifier },
        dependencies,
      );

      expect(gateway.revokeInstallation).not.toHaveBeenCalled();
    });
  });
});
