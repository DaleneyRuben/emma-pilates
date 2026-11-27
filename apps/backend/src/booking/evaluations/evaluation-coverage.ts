import type { Prisma } from '../../generated/prisma/client';
import { EvaluationState, PaymentMethod } from '../../generated/prisma/client';
import { netAllowanceClasses } from '../commands/net-allowance';
import { isSubscriptionEffective } from '../payments/purchase-eligibility';

type Transaction = Prisma.TransactionClient;

type CoverageCandidate = {
  id: string;
  courtesy: boolean;
  endsOn: Date;
  remainingClassAllowance: number;
  allowanceAdjustments: readonly { classes: number }[];
  _count: { bookings: number };
};

const isEffective = (candidate: CoverageCandidate, today: Date) =>
  isSubscriptionEffective(
    {
      endsOn: candidate.endsOn,
      remainingClassAllowance: candidate.remainingClassAllowance,
      extraClasses: netAllowanceClasses(candidate.allowanceAdjustments),
      futureBookedCount: candidate._count.bookings,
    },
    today,
  );

// The same effectiveness check a class booking uses: a date range alone is
// not enough, an exhausted Plan cannot book an Evaluation. A paid Plan wins
// over Courtesy Access on the same date, so its included Evaluation is not
// lost (owner, 2026-11-27).
export const pickCoveringSubscription = <Candidate extends CoverageCandidate>(
  candidates: readonly Candidate[],
  today: Date,
): Candidate | null => {
  const effective = candidates.filter((candidate) =>
    isEffective(candidate, today),
  );
  return (
    effective.find((candidate) => !candidate.courtesy) ?? effective[0] ?? null
  );
};

const coverageSelect = (now: Date) =>
  ({
    id: true,
    planId: true,
    planNameSnapshot: true,
    durationDaysSnapshot: true,
    weeklyClassCapSnapshot: true,
    originalClassAllowance: true,
    startsOn: true,
    endsOn: true,
    remainingClassAllowance: true,
    plan: { select: { priceCentavos: true } },
    payment: { select: { method: true } },
    allowanceAdjustments: {
      where: { deletedAt: null },
      select: { classes: true },
    },
    evaluations: {
      where: {
        state: { in: [EvaluationState.BOOKED, EvaluationState.NO_SHOW] },
      },
      select: { id: true },
    },
    _count: {
      select: {
        bookings: {
          where: { state: 'BOOKED', session: { startsAt: { gt: now } } },
        },
      },
    },
  }) as const satisfies Prisma.SubscriptionSelect;

// A Guest Pass is not her Plan and never covers an Evaluation (FIX-019).
// Courtesy Access covers one, always as a Paid Evaluation (owner,
// 2026-11-27): a Bs 0 Plan or a courtesy Payment marks it.
const coveringCandidates = async (
  transaction: Transaction,
  input: { clientId: string; from: Date; through: Date; now: Date },
) => {
  const rows = await transaction.subscription.findMany({
    where: {
      clientId: input.clientId,
      state: 'ACTIVE',
      startsOn: { lte: input.through },
      endsOn: { gte: input.from },
      guestPasses: { none: { deletedAt: null } },
    },
    orderBy: [{ endsOn: 'desc' }, { id: 'asc' }],
    select: coverageSelect(input.now),
  });
  return rows.map((row) => ({
    ...row,
    courtesy:
      row.plan.priceCentavos === 0 ||
      row.payment?.method === PaymentMethod.COURTESY,
  }));
};

export const coveringSubscription = async (
  transaction: Transaction,
  input: { clientId: string; slotDate: Date; today: Date; now: Date },
) =>
  pickCoveringSubscription(
    await coveringCandidates(transaction, {
      clientId: input.clientId,
      from: input.slotDate,
      through: input.slotDate,
      now: input.now,
    }),
    input.today,
  );

// Whether any Plan in force lets her book an Evaluation between the two
// dates: the app shows C13b up front when none does.
export const planCoversEvaluationBetween = async (
  transaction: Transaction,
  input: {
    clientId: string;
    from: Date;
    through: Date;
    today: Date;
    now: Date;
  },
): Promise<boolean> =>
  pickCoveringSubscription(
    await coveringCandidates(transaction, input),
    input.today,
  ) !== null;
