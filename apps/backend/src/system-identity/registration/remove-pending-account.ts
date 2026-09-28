import type { Prisma } from '../../generated/prisma/client';

// ADR-0086: a pending Account and its domain identity are marked removed,
// never deleted. Invalidating every unused link keeps a queued email or a
// kept continuation from reviving it, and the live-only email index frees the
// address for a new registration.
export const removePendingAccount = async (
  transaction: Prisma.TransactionClient,
  input: {
    accountId: string;
    clientId: string | null;
    staffMemberId: string | null;
    now: Date;
  },
): Promise<void> => {
  await transaction.authenticationToken.updateMany({
    where: { accountId: input.accountId, usedAt: null, invalidatedAt: null },
    data: { invalidatedAt: input.now },
  });
  await transaction.account.update({
    where: { id: input.accountId },
    data: { deletedAt: input.now },
  });
  if (input.clientId !== null) {
    await transaction.client.update({
      where: { id: input.clientId },
      data: { deletedAt: input.now },
    });
  }
  if (input.staffMemberId !== null) {
    await transaction.staffMember.update({
      where: { id: input.staffMemberId },
      data: { deletedAt: input.now },
    });
  }
};
