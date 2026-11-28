import type { Prisma } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { hasSpendableExtra } from './net-allowance';

type Transaction = Prisma.TransactionClient;

const covering = (clientId: string, onDate: Date) => ({
  clientId,
  state: 'ACTIVE' as const,
  endsOn: { gte: boliviaDate(onDate) },
});

// The booking check reads Subscription.startsOn (booking ADR-0005): a Session
// before it is not eligible, and is reported apart from a spent allowance.
// When several cover the day, a paid Plan comes before a Guest Pass, which
// only funds a class no other Subscription can (owner, 2026-11-28); then the
// earliest start. A Plan with no class left cannot fund one, so the pass does.
export const findCoveringSubscription = async (
  transaction: Transaction,
  input: { clientId: string; onDate: Date; needsAllowance: boolean },
) => {
  const candidates = await transaction.subscription.findMany({
    where: {
      ...covering(input.clientId, input.onDate),
      startsOn: { lte: boliviaDate(input.onDate) },
      ...(input.needsAllowance
        ? {
            OR: [
              { remainingClassAllowance: { gt: 0 } },
              { allowanceAdjustments: { some: { deletedAt: null } } },
            ],
          }
        : {}),
    },
    orderBy: [{ startsOn: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      remainingClassAllowance: true,
      allowanceAdjustments: {
        where: { deletedAt: null },
        select: { classes: true },
      },
      guestPasses: {
        where: { deletedAt: null },
        select: { bookingId: true },
      },
    },
  });
  const ordered = [
    ...candidates.filter((candidate) => candidate.guestPasses.length === 0),
    ...candidates.filter((candidate) => candidate.guestPasses.length > 0),
  ];
  if (!input.needsAllowance) {
    return ordered[0] === undefined ? null : { id: ordered[0].id };
  }
  const funding = ordered.find(
    (candidate) =>
      candidate.remainingClassAllowance > 0 ||
      hasSpendableExtra(candidate.allowanceAdjustments),
  );
  if (funding !== undefined) return { id: funding.id };
  // A spent Guest Pass still covers her, so a second class answers
  // guest_pass_already_used instead of looking like no Subscription.
  const spentPass = ordered.find((candidate) =>
    candidate.guestPasses.some((pass) => pass.bookingId !== null),
  );
  return spentPass === undefined ? null : { id: spentPass.id };
};

// One approved Freeze covers a Client on a Bolivia date. Booking, waitlist
// join, promotion, and reschedule all ask the same question.
export const findApprovedFreeze = (
  transaction: Transaction,
  input: { clientId: string; onDate: Date },
) =>
  transaction.freeze.findFirst({
    where: {
      clientId: input.clientId,
      state: 'APPROVED',
      deletedAt: null,
      startsOn: { lte: boliviaDate(input.onDate) },
      endsOn: { gte: boliviaDate(input.onDate) },
    },
    select: { endsOn: true },
  });

export const findNotYetStartedSubscription = (
  transaction: Transaction,
  input: { clientId: string; onDate: Date },
) =>
  transaction.subscription.findFirst({
    where: {
      ...covering(input.clientId, input.onDate),
      startsOn: { gt: boliviaDate(input.onDate) },
    },
    orderBy: [{ startsOn: 'asc' }, { id: 'asc' }],
    select: { startsOn: true },
  });
