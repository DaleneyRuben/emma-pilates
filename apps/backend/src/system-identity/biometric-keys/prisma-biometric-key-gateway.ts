import type { PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationSessionSurface,
  BiometricKeyRevocationReason as PrismaReason,
} from '../../generated/prisma/enums';
import { toPrismaBytes } from '../../database/prisma-bytes';
import type {
  BiometricKeyGateway,
  BiometricKeyRevocationReason,
  NewBiometricKey,
} from './biometric-keys';

export type PrismaBiometricKeyGateway = Omit<
  BiometricKeyGateway,
  'readThrottleEvents' | 'recordFailedCredentialCheck'
>;

const reasons: Record<BiometricKeyRevocationReason, PrismaReason> = {
  rotated: PrismaReason.ROTATED,
  replaced: PrismaReason.REPLACED,
  turned_off: PrismaReason.TURNED_OFF,
  reuse_detected: PrismaReason.REUSE_DETECTED,
  password_changed: PrismaReason.PASSWORD_CHANGED,
  password_recovered: PrismaReason.PASSWORD_RECOVERED,
  account_disabled: PrismaReason.ACCOUNT_DISABLED,
  account_closed: PrismaReason.ACCOUNT_CLOSED,
};
const reasonOf = (reason: PrismaReason): BiometricKeyRevocationReason =>
  (Object.keys(reasons) as BiometricKeyRevocationReason[]).find(
    (name) => reasons[name] === reason,
  )!;

const keyData = (key: NewBiometricKey) => ({
  id: key.id,
  accountId: key.accountId,
  installationIdDigest: toPrismaBytes(key.installationIdDigest),
  keyDigest: toPrismaBytes(key.keyDigest),
  unlockSecretDigest: toPrismaBytes(key.unlockSecretDigest),
  issuedAt: key.issuedAt,
  expiresAt: key.expiresAt,
});

const live = { revokedAt: null, deletedAt: null } as const;

export const createPrismaBiometricKeyGateway = (
  prisma: PrismaClient,
): PrismaBiometricKeyGateway => ({
  issue: ({ key, actor, auditRecordId }) =>
    prisma.$transaction(async (transaction) => {
      await transaction.biometricKey.updateMany({
        where: {
          ...live,
          installationIdDigest: toPrismaBytes(key.installationIdDigest),
        },
        data: {
          revokedAt: key.issuedAt,
          revocationReason: PrismaReason.REPLACED,
        },
      });
      await transaction.biometricKey.create({ data: keyData(key) });
      await transaction.auditRecord.create({
        data: {
          id: auditRecordId,
          actionCode: 'account.biometric_key_issued',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.ACCOUNT,
          actorAccountId: actor.accountId,
          actorRole: actor.role,
          impersonationId: actor.impersonationId,
          targetType: 'account',
          targetId: key.accountId,
          correlationId: auditRecordId,
          occurredAt: key.issuedAt,
        },
      });
    }),

  async findByKeyDigest(digest) {
    const row = await prisma.biometricKey.findUnique({
      where: { keyDigest: toPrismaBytes(digest) },
      select: {
        id: true,
        accountId: true,
        installationIdDigest: true,
        unlockSecretDigest: true,
        expiresAt: true,
        revokedAt: true,
        revocationReason: true,
        deletedAt: true,
        account: {
          select: {
            activatedAt: true,
            emailVerifiedAt: true,
            disabledAt: true,
            deletedAt: true,
          },
        },
      },
    });

    if (row === null || row.deletedAt !== null) {
      return null;
    }

    const { account } = row;

    return {
      id: row.id,
      accountId: row.accountId,
      installationIdDigest: Buffer.from(row.installationIdDigest),
      unlockSecretDigest: Buffer.from(row.unlockSecretDigest),
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      revocationReason:
        row.revocationReason === null ? null : reasonOf(row.revocationReason),
      accountCanSignIn:
        account.activatedAt !== null &&
        account.emailVerifiedAt !== null &&
        account.disabledAt === null &&
        account.deletedAt === null,
    };
  },

  // The previous key is revoked first: of two requests racing with the same
  // key, the second finds it revoked and opens nothing.
  rotate: ({ previousKeyId, key, session }) =>
    prisma.$transaction(async (transaction) => {
      const { count } = await transaction.biometricKey.updateMany({
        where: { ...live, id: previousKeyId },
        data: {
          revokedAt: key.issuedAt,
          revocationReason: PrismaReason.ROTATED,
        },
      });

      if (count !== 1) {
        return false;
      }

      await transaction.biometricKey.create({ data: keyData(key) });
      await transaction.authenticationSession.create({
        data: {
          id: session.id,
          accountId: session.accountId,
          surface: AuthenticationSessionSurface.MOBILE,
          credentialDigest: toPrismaBytes(session.credentialDigest),
          createdAt: session.createdAt,
          lastMeaningfulActivityAt: session.lastMeaningfulActivityAt,
          idleExpiresAt: session.idleExpiresAt,
          absoluteExpiresAt: session.absoluteExpiresAt,
        },
      });
      return true;
    }),

  revokeInstallation: (input) =>
    prisma.$transaction(async (transaction) => {
      await transaction.biometricKey.updateMany({
        where: {
          ...live,
          accountId: input.accountId,
          installationIdDigest: toPrismaBytes(input.installationIdDigest),
        },
        data: {
          revokedAt: input.revokedAt,
          revocationReason: reasons[input.reason],
        },
      });
      await transaction.auditRecord.create({
        data: {
          id: input.auditRecordId,
          actionCode: 'account.biometric_key_revoked',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.ACCOUNT,
          actorAccountId: input.accountId,
          targetType: 'account',
          targetId: input.accountId,
          correlationId: input.auditRecordId,
          metadata: { reason: input.reason },
          occurredAt: input.revokedAt,
        },
      });
    }),
});
