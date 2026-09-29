import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AccountDeviceDeactivationReason,
  AuthenticationSessionRevocationReason,
} from '../../generated/prisma/enums';
import { verifyPassword } from '../security/argon2-password-hasher';

// System Identity's side of closing a Client's Account (BE-007 G6), run
// inside the Booking & Membership closure transaction: every Authentication
// Session is revoked, unused links are invalidated, devices are deactivated,
// and the Account is marked removed. Its email stays on the row and becomes
// free for a new registration through the live-only unique index (ADR-0086).
export const createAccountClosureOperations = (
  transaction: Prisma.TransactionClient,
) => ({
  closeAccount: async (input: { accountId: string; occurredAt: Date }) => {
    const { accountId, occurredAt } = input;
    await transaction.authenticationSession.updateMany({
      where: { accountId, revokedAt: null },
      data: {
        revokedAt: occurredAt,
        revocationReason: AuthenticationSessionRevocationReason.ACCOUNT_CLOSED,
      },
    });
    await transaction.authenticationToken.updateMany({
      where: { accountId, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: occurredAt },
    });
    await transaction.accountDevice.updateMany({
      where: { accountId, deactivatedAt: null },
      data: {
        deactivatedAt: occurredAt,
        // A deactivated device holds no push token (account_devices_active_state_check).
        expoPushToken: null,
        deactivationReason: AccountDeviceDeactivationReason.ACCOUNT_DISABLED,
      },
    });
    await transaction.accountEmailChange.updateMany({
      where: { accountId, deletedAt: null },
      data: { deletedAt: occurredAt },
    });
    await transaction.account.update({
      where: { id: accountId },
      data: { deletedAt: occurredAt },
    });
  },
});

// The password re-entry that confirms a Client's own closure.
export const createAccountPasswordVerifier =
  (prisma: PrismaClient) =>
  async (accountId: string, password: string): Promise<boolean> => {
    const account = await prisma.account.findFirst({
      where: { id: accountId, deletedAt: null },
      select: { passwordHash: true },
    });
    return (
      account?.passwordHash != null &&
      (await verifyPassword(account.passwordHash, password))
    );
  };
