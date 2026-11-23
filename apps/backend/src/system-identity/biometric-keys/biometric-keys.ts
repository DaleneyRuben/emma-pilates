import type { AuditActor } from '../authentication/audit-actor';
import type { NewAuthenticationSession } from '../authentication/create-authentication-session';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';

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

const notImplemented = (...inputs: unknown[]): Promise<never> =>
  Promise.reject(new Error(`Not implemented (${inputs.length})`));

export const issueBiometricKey = (
  principal: AuthenticatedPrincipal,
  command: { clientIdentifier: string | null },
  dependencies: BiometricKeyDependencies,
): Promise<{ deviceKey: string; unlockSecret: string }> =>
  notImplemented(principal, command, dependencies);

export const exchangeBiometricKey = (
  command: {
    deviceKey: string;
    unlockSecret: string;
    clientIdentifier: string | null;
    networkAddress: string;
  },
  dependencies: BiometricKeyDependencies,
): Promise<{ credential: string; deviceKey: string }> =>
  notImplemented(command, dependencies);

export const revokeBiometricKey = (
  command: { deviceKey: string; clientIdentifier: string | null },
  dependencies: BiometricKeyDependencies,
): Promise<void> => notImplemented(command, dependencies);
