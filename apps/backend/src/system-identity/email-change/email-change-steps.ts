import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { toPrismaBytes } from '../../database/prisma-bytes';
import { AuthenticationTokenPurpose } from '../../generated/prisma/enums';
import type { EmailChangeToken } from './email-change';

type Transaction = Prisma.TransactionClient;

// IDN-008's storage steps, shared by the Account's own change and the one the
// studio asks for (FIX-039): one pending change per Account, whose token is
// the only live `email_change` link.

// The pending change with its token, or null when the token is no longer
// current (used, invalidated, expired) or nothing was requested.
export const livePendingEmailChange = async (
  transaction: Pick<PrismaClient, 'accountEmailChange'>,
  accountId: string,
  now: Date,
) => {
  const change = await transaction.accountEmailChange.findFirst({
    where: { accountId, deletedAt: null },
    include: { authenticationToken: true },
  });
  if (
    change === null ||
    change.authenticationToken.usedAt !== null ||
    change.authenticationToken.invalidatedAt !== null ||
    change.authenticationToken.expiresAt <= now
  ) {
    return null;
  }
  return change;
};

const invalidateCurrentLink = (
  transaction: Transaction,
  accountId: string,
  now: Date,
) =>
  transaction.authenticationToken.updateMany({
    where: {
      accountId,
      purpose: AuthenticationTokenPurpose.EMAIL_CHANGE,
      usedAt: null,
      invalidatedAt: null,
    },
    data: { invalidatedAt: now },
  });

const createLink = (
  transaction: Transaction,
  accountId: string,
  token: EmailChangeToken,
  now: Date,
) =>
  transaction.authenticationToken.create({
    data: {
      id: token.id,
      accountId,
      purpose: AuthenticationTokenPurpose.EMAIL_CHANGE,
      tokenDigest: toPrismaBytes(token.digest),
      issuedAt: now,
      expiresAt: token.expiresAt,
    },
  });

// E5: a new request replaces the pending change and its link.
export const storePendingEmailChange = async (
  transaction: Transaction,
  input: {
    accountId: string;
    newEmail: string;
    token: EmailChangeToken;
    now: Date;
  },
) => {
  await invalidateCurrentLink(transaction, input.accountId, input.now);
  await createLink(transaction, input.accountId, input.token, input.now);
  const replaced = await transaction.accountEmailChange.updateMany({
    where: { accountId: input.accountId, deletedAt: null },
    data: {
      newEmail: input.newEmail,
      authenticationTokenId: input.token.id,
      requestedAt: input.now,
      expiresAt: input.token.expiresAt,
    },
  });
  if (replaced.count === 0) {
    await transaction.accountEmailChange.create({
      data: {
        accountId: input.accountId,
        newEmail: input.newEmail,
        authenticationTokenId: input.token.id,
        requestedAt: input.now,
        expiresAt: input.token.expiresAt,
      },
    });
  }
};

// E6: a resend keeps the pending address with a fresh link.
export const reissuePendingEmailChange = async (
  transaction: Transaction,
  input: { accountId: string; token: EmailChangeToken; now: Date },
) => {
  await invalidateCurrentLink(transaction, input.accountId, input.now);
  await createLink(transaction, input.accountId, input.token, input.now);
  await transaction.accountEmailChange.updateMany({
    where: { accountId: input.accountId, deletedAt: null },
    data: {
      authenticationTokenId: input.token.id,
      expiresAt: input.token.expiresAt,
    },
  });
};

// E6: cancelling invalidates the link and marks the pending change removed.
export const dropPendingEmailChange = async (
  transaction: Transaction,
  input: { accountId: string; now: Date },
) => {
  await invalidateCurrentLink(transaction, input.accountId, input.now);
  await transaction.accountEmailChange.updateMany({
    where: { accountId: input.accountId, deletedAt: null },
    data: { deletedAt: input.now },
  });
};
