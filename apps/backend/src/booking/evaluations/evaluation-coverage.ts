type CoverageCandidate = {
  id: string;
  courtesy: boolean;
  endsOn: Date;
  remainingClassAllowance: number;
  allowanceAdjustments: readonly { classes: number }[];
  _count: { bookings: number };
};

export const pickCoveringSubscription = <Candidate extends CoverageCandidate>(
  candidates: readonly Candidate[],
  today: Date,
): Candidate | null => (candidates.length > 0 && today ? null : null);
