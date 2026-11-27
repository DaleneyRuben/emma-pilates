import { netAllowanceClasses } from '../commands/net-allowance';
import { isSubscriptionEffective } from '../payments/purchase-eligibility';

export type CoverageCandidate = {
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
