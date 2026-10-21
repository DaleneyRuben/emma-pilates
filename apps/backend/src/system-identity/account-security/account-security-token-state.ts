import type { Prisma } from '../../generated/prisma/client';
import { toPrismaBytes } from '../../database/prisma-bytes';
import { AuthenticationTokenPurpose } from '../../generated/prisma/enums';

// Token and Account state rules shared by the activation and recovery links.
export const findToken = (
  transaction: Prisma.TransactionClient,
  digest: Uint8Array,
) =>
  transaction.authenticationToken.findUnique({
    where: { tokenDigest: toPrismaBytes(digest) },
    include: { account: true },
  });

export type StoredToken = NonNullable<Awaited<ReturnType<typeof findToken>>>;

export const isCurrentToken = (
  token: StoredToken,
  now: Date,
  purpose: 'activation' | 'password_recovery',
): boolean =>
  token.usedAt === null &&
  token.invalidatedAt === null &&
  token.expiresAt > now &&
  token.account.disabledAt === null &&
  (purpose === 'password_recovery'
    ? token.account.activatedAt !== null &&
      token.account.emailVerifiedAt !== null &&
      token.account.passwordHash !== null
    : token.account.activatedAt === null &&
      token.account.emailVerifiedAt === null &&
      token.account.passwordHash === null &&
      token.account.pendingExpiresAt !== null &&
      token.account.pendingExpiresAt > now);

// ADR-0029: an invitation left untouched for 30 days is removed. The cleanup
// removes it after its pending window; a staff cancellation removes it
// before, and only the first reads as «Esta invitación ya no está activa».
export const isRemovedInvitation = (
  account: StoredToken['account'],
  now: Date,
): boolean =>
  account.activatedAt === null &&
  account.pendingExpiresAt !== null &&
  account.pendingExpiresAt <= (account.deletedAt ?? now);

// IDN-008 E11: taking the Account back also drops a pending email change.
export const cancelPendingEmailChange = async (
  transaction: Prisma.TransactionClient,
  accountId: string,
  at: Date,
): Promise<void> => {
  await transaction.authenticationToken.updateMany({
    where: {
      accountId,
      purpose: AuthenticationTokenPurpose.EMAIL_CHANGE,
      usedAt: null,
      invalidatedAt: null,
    },
    data: { invalidatedAt: at },
  });
};

const minuteMilliseconds = 60 * 1_000;
const hourMilliseconds = 60 * minuteMilliseconds;
export const dayMilliseconds = 24 * hourMilliseconds;

export const canIssueRecoveryEmail = (
  events: { occurredAt: Date }[],
  now: Date,
): boolean => {
  const inLastFiveMinutes = events.some(
    ({ occurredAt }) =>
      occurredAt >= new Date(now.getTime() - 5 * minuteMilliseconds),
  );
  const inLastHour = events.filter(
    ({ occurredAt }) =>
      occurredAt >= new Date(now.getTime() - hourMilliseconds),
  ).length;

  return !inLastFiveMinutes && inLastHour < 3 && events.length < 5;
};
