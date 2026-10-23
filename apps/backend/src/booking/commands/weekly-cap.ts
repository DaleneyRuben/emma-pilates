export const boliviaWeek = (
  instant: Date,
): { startsOn: Date; endsOn: Date } => {
  void instant;
  throw new Error('weekly cap week is not implemented');
};

export const baseRemainingAfterCap = (input: {
  weeklyClassCap: number | null;
  baseFundedBookings: number;
  remainingClassAllowance: number;
  extraClasses: number;
}): { baseAvailable: number; classesLeftThisWeek: number | null } => {
  void input;
  throw new Error('weekly cap remaining is not implemented');
};
