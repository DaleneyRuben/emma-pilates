import type { Prisma } from '../../generated/prisma/client';
import { BiometricKeyRevocationReason } from '../../generated/prisma/enums';

type AccountWideReason =
  | typeof BiometricKeyRevocationReason.PASSWORD_CHANGED
  | typeof BiometricKeyRevocationReason.PASSWORD_RECOVERED
  | typeof BiometricKeyRevocationReason.ACCOUNT_DISABLED
  | typeof BiometricKeyRevocationReason.ACCOUNT_CLOSED;

/**
 * ADR-0112: a new password, a deactivation or a closure ends biometric sign-in
 * on every phone of the Account, the one that made the change included.
 */
export const revokeAccountBiometricKeys = async (
  transaction: Prisma.TransactionClient,
  accountId: string,
  input: { revokedAt: Date; reason: AccountWideReason },
): Promise<void> => {
  await transaction.biometricKey.updateMany({
    where: { accountId, revokedAt: null, deletedAt: null },
    data: { revokedAt: input.revokedAt, revocationReason: input.reason },
  });
};
