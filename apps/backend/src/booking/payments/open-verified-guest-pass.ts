import type { Prisma } from '../../generated/prisma/client';
import { isMonthlyInviteSpent } from './guest-pass';
import { GuestPassError, openGuestPass } from './open-guest-pass';

type Transaction = Prisma.TransactionClient;

// The monthly invite is spent here, once her email is verified or her
// invitation is activated. The host's month is already used, or she has no
// Client code: either way verification succeeds and no pass is opened.
export const openGuestPassForVerifiedClient = async (
  transaction: Transaction,
  input: { friendClientId: string; authorAccountId: string; now: Date },
): Promise<void> => {
  const acquisition = await transaction.clientAcquisition.findFirst({
    where: { clientId: input.friendClientId, deletedAt: null },
    select: { referrerClientId: true },
  });
  if (acquisition?.referrerClientId == null) return;
  const existing = await transaction.guestPass.findFirst({
    where: { friendClientId: input.friendClientId, deletedAt: null },
    select: { id: true },
  });
  if (existing !== null) return;
  try {
    await openGuestPass(transaction, {
      hostClientId: acquisition.referrerClientId,
      friendClientId: input.friendClientId,
      authorAccountId: input.authorAccountId,
      now: input.now,
    });
  } catch (error) {
    if (error instanceof GuestPassError && isMonthlyInviteSpent(error)) {
      return;
    }
    throw error;
  }
};
