import { type AuditActor, auditActorOf } from '../authentication/audit-actor';
import {
  newAuthenticationSession,
  type NewAuthenticationSession,
} from '../authentication/create-authentication-session';
import { LoginThrottledError } from '../authentication/login';
import { getLoginThrottle } from '../authentication/login-throttle-policy';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import { sourceDigests } from '../security/request-source';

export type BiometricKeyRevocationReason =
  | 'rotated'
  | 'replaced'
  | 'turned_off'
  | 'reuse_detected'
  | 'password_changed'
  | 'password_recovered'
  | 'account_disabled'
  | 'account_closed';

export type NewBiometricKey = {
  id: string;
  accountId: string;
  installationIdDigest: Uint8Array;
  keyDigest: Uint8Array;
  unlockSecretDigest: Uint8Array;
  issuedAt: Date;
  expiresAt: Date;
};

export type StoredBiometricKey = {
  id: string;
  accountId: string;
  installationIdDigest: Uint8Array;
  unlockSecretDigest: Uint8Array;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revocationReason: BiometricKeyRevocationReason | null;
  /** Activated, verified, neither disabled nor closed. */
  accountCanSignIn: boolean;
};

type ThrottleDigests = {
  loginLaneDigest: Uint8Array;
  clientDigest: Uint8Array | null;
  networkDigest: Uint8Array;
};

export type BiometricKeyGateway = {
  issue(input: {
    key: NewBiometricKey;
    actor: AuditActor;
    auditRecordId: string;
  }): Promise<void>;
  findByKeyDigest(digest: Uint8Array): Promise<StoredBiometricKey | null>;
  findLiveKey(input: {
    accountId: string;
    installationIdDigest: Uint8Array;
  }): Promise<StoredBiometricKey | null>;
  /** False when another request revoked the previous key first. */
  rotate(input: {
    previousKeyId: string;
    key: NewBiometricKey;
    session: NewAuthenticationSession;
  }): Promise<boolean>;
  revokeInstallation(input: {
    accountId: string;
    installationIdDigest: Uint8Array;
    revokedAt: Date;
    reason: 'turned_off' | 'reuse_detected';
    auditRecordId: string;
  }): Promise<void>;
  readThrottleEvents(input: ThrottleDigests & { now: Date }): Promise<{
    loginLaneFailures: Date[];
    clientFailures: Date[];
    networkFailures: Date[];
  }>;
  recordFailedCredentialCheck(
    input: ThrottleDigests & { occurredAt: Date; expiresAt: Date },
  ): Promise<void>;
};

export type BiometricKeyDependencies = {
  gateway: BiometricKeyGateway;
  digestSignal(value: string): Uint8Array;
  tokens: {
    issue(): { secret: string; digest: Uint8Array };
    digest(secret: string): Uint8Array;
    matches(secret: string, expected: Uint8Array): boolean;
  };
  now(): Date;
  newId(): string;
};

export class BiometricKeyRejectedError extends Error {}
export class MissingInstallationError extends Error {}

const dayMilliseconds = 24 * 60 * 60 * 1_000;
/** Unused for this long, a key stops working; each use renews it. */
export const biometricKeyLifetimeMilliseconds = 90 * dayMilliseconds;
const failedCheckLifetimeMilliseconds = 60 * 60 * 1_000;
/** A phone that lost the exchange's answer may send the key just replaced. */
const lostAnswerGraceMilliseconds = 2 * 60 * 1_000;

const installationDigest = (
  clientIdentifier: string,
  dependencies: Pick<BiometricKeyDependencies, 'digestSignal'>,
): Uint8Array => dependencies.digestSignal(`installation:${clientIdentifier}`);

const sameDigest = (left: Uint8Array, right: Uint8Array): boolean =>
  Buffer.from(left).equals(Buffer.from(right));

const newKey = (
  input: {
    accountId: string;
    installationIdDigest: Uint8Array;
    keyDigest: Uint8Array;
    unlockSecretDigest: Uint8Array;
  },
  dependencies: Pick<BiometricKeyDependencies, 'newId' | 'now'>,
): NewBiometricKey => {
  const issuedAt = dependencies.now();

  return {
    id: dependencies.newId(),
    ...input,
    issuedAt,
    expiresAt: new Date(issuedAt.getTime() + biometricKeyLifetimeMilliseconds),
  };
};

const requireInstallation = (clientIdentifier: string | null): string => {
  if (clientIdentifier === null) {
    throw new MissingInstallationError('A key belongs to one installation');
  }

  return clientIdentifier;
};

/** «Usar mi huella»: a key for this installation replaces any it had. */
export const issueBiometricKey = async (
  principal: AuthenticatedPrincipal,
  command: { clientIdentifier: string | null },
  dependencies: BiometricKeyDependencies,
): Promise<{ deviceKey: string; unlockSecret: string }> => {
  const clientIdentifier = requireInstallation(command.clientIdentifier);
  const deviceKey = dependencies.tokens.issue();
  const unlockSecret = dependencies.tokens.issue();

  await dependencies.gateway.issue({
    key: newKey(
      {
        accountId: principal.accountId,
        installationIdDigest: installationDigest(
          clientIdentifier,
          dependencies,
        ),
        keyDigest: deviceKey.digest,
        unlockSecretDigest: unlockSecret.digest,
      },
      dependencies,
    ),
    actor: auditActorOf(principal),
    auditRecordId: dependencies.newId(),
  });

  return { deviceKey: deviceKey.secret, unlockSecret: unlockSecret.secret };
};

/**
 * The live key that replaced `stored` moments ago and was never used since:
 * the phone holding `stored` simply never received it.
 */
const lostAnswerSuccessor = async (
  stored: StoredBiometricKey,
  unlockSecret: string,
  now: Date,
  dependencies: BiometricKeyDependencies,
): Promise<StoredBiometricKey | null> => {
  const rotatedAt = stored.revokedAt;
  if (
    rotatedAt === null ||
    now.getTime() - rotatedAt.getTime() > lostAnswerGraceMilliseconds ||
    !dependencies.tokens.matches(unlockSecret, stored.unlockSecretDigest)
  ) {
    return null;
  }

  const successor = await dependencies.gateway.findLiveKey({
    accountId: stored.accountId,
    installationIdDigest: stored.installationIdDigest,
  });

  return successor?.issuedAt.getTime() === rotatedAt.getTime()
    ? successor
    : null;
};

type ExchangeCommand = {
  deviceKey: string;
  unlockSecret: string;
  clientIdentifier: string | null;
  networkAddress: string;
};

/**
 * The next launch: the key and the unlock secret behind the fingerprint or
 * Face ID open a new session and the key is replaced. A replaced key that
 * comes back was copied, so the installation loses every key it has.
 */
export const exchangeBiometricKey = async (
  command: ExchangeCommand,
  dependencies: BiometricKeyDependencies,
): Promise<{ credential: string; deviceKey: string }> => {
  const clientIdentifier = requireInstallation(command.clientIdentifier);
  const { gateway } = dependencies;
  const now = dependencies.now();
  const throttleDigests = {
    loginLaneDigest: dependencies.digestSignal(
      `biometric-lane:client:${clientIdentifier}\0network:${command.networkAddress}`,
    ),
    ...sourceDigests(
      { clientIdentifier, networkAddress: command.networkAddress },
      (value) => dependencies.digestSignal(value),
    ),
  };
  const throttle = getLoginThrottle(
    now,
    await gateway.readThrottleEvents({ ...throttleDigests, now }),
  );

  if (throttle !== null) {
    throw new LoginThrottledError(throttle.retryAfterSeconds);
  }

  const reject = async (): Promise<never> => {
    await gateway.recordFailedCredentialCheck({
      ...throttleDigests,
      occurredAt: now,
      expiresAt: new Date(now.getTime() + failedCheckLifetimeMilliseconds),
    });
    throw new BiometricKeyRejectedError('The biometric key is not valid');
  };
  const stored = await gateway.findByKeyDigest(
    dependencies.tokens.digest(command.deviceKey),
  );
  const installationIdDigest = installationDigest(
    clientIdentifier,
    dependencies,
  );

  if (
    stored === null ||
    !sameDigest(stored.installationIdDigest, installationIdDigest)
  ) {
    return reject();
  }

  let current = stored;

  if (stored.revocationReason === 'rotated') {
    const successor = await lostAnswerSuccessor(
      stored,
      command.unlockSecret,
      now,
      dependencies,
    );

    if (successor === null) {
      await gateway.revokeInstallation({
        accountId: stored.accountId,
        installationIdDigest,
        revokedAt: now,
        reason: 'reuse_detected',
        auditRecordId: dependencies.newId(),
      });
      return reject();
    }

    current = successor;
  }

  if (
    current.revokedAt !== null ||
    current.expiresAt.getTime() <= now.getTime() ||
    !current.accountCanSignIn ||
    !dependencies.tokens.matches(
      command.unlockSecret,
      current.unlockSecretDigest,
    )
  ) {
    return reject();
  }

  const deviceKey = dependencies.tokens.issue();
  const credential = dependencies.tokens.issue();
  const rotated = await gateway.rotate({
    previousKeyId: current.id,
    key: newKey(
      {
        accountId: current.accountId,
        installationIdDigest,
        keyDigest: deviceKey.digest,
        unlockSecretDigest: current.unlockSecretDigest,
      },
      dependencies,
    ),
    session: newAuthenticationSession(
      {
        id: dependencies.newId(),
        accountId: current.accountId,
        surface: 'mobile',
        credentialDigest: credential.digest,
      },
      now,
    ),
  });

  if (!rotated) {
    return reject();
  }

  return { credential: credential.secret, deviceKey: deviceKey.secret };
};

/**
 * Perfil's switch turned off, or «Usar otra cuenta»: neither has a session
 * to show, so the key itself says which installation forgets biometrics.
 */
export const revokeBiometricKey = async (
  command: { deviceKey: string; clientIdentifier: string | null },
  dependencies: BiometricKeyDependencies,
): Promise<void> => {
  const clientIdentifier = requireInstallation(command.clientIdentifier);
  const stored = await dependencies.gateway.findByKeyDigest(
    dependencies.tokens.digest(command.deviceKey),
  );
  const installationIdDigest = installationDigest(
    clientIdentifier,
    dependencies,
  );

  if (
    stored === null ||
    !sameDigest(stored.installationIdDigest, installationIdDigest)
  ) {
    return;
  }

  await dependencies.gateway.revokeInstallation({
    accountId: stored.accountId,
    installationIdDigest,
    revokedAt: dependencies.now(),
    reason: 'turned_off',
    auditRecordId: dependencies.newId(),
  });
};
