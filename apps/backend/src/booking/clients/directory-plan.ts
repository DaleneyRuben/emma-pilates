// The Plan a Clientas row describes (walkthrough n.º 60 and 61): the current
// Subscription with its live extra classes, or, once a Guest Pass's class is
// spent, the Plan she bought after it.
export const directoryPlanSelect = {
  planNameSnapshot: true,
  remainingClassAllowance: true,
  originalClassAllowance: true,
  startsOn: true,
  endsOn: true,
  allowanceAdjustments: {
    where: { deletedAt: null },
    select: { classes: true },
  },
  guestPasses: {
    where: { deletedAt: null },
    select: { bookingId: true },
  },
} as const;

type DirectoryPlanRow = {
  planNameSnapshot: string;
  remainingClassAllowance: number;
  originalClassAllowance: number;
  startsOn: Date;
  endsOn: Date;
  allowanceAdjustments: { classes: number }[];
  guestPasses: { bookingId: string | null }[];
};

export type DirectoryPlan = {
  planName: string;
  remainingClassAllowance: number;
  originalClassAllowance: number;
  extraClasses: number;
  /** Set when the Plan described starts after today. */
  planStartsOn: Date | null;
  planEndsOn: Date;
};

export const liveExtraClasses = (
  adjustments: readonly { classes: number }[],
): number =>
  Math.max(
    0,
    adjustments.reduce((sum, adjustment) => sum + adjustment.classes, 0),
  );

const describe = (
  row: DirectoryPlanRow,
  startsLater: boolean,
): DirectoryPlan => ({
  planName: row.planNameSnapshot,
  remainingClassAllowance: row.remainingClassAllowance,
  originalClassAllowance: row.originalClassAllowance,
  extraClasses: liveExtraClasses(row.allowanceAdjustments),
  planStartsOn: startsLater ? row.startsOn : null,
  planEndsOn: row.endsOn,
});

export const directoryPlan = (
  active: DirectoryPlanRow | undefined,
  next: DirectoryPlanRow | undefined,
): DirectoryPlan | null => {
  if (active === undefined) return null;
  const spentGuestPass = active.guestPasses.some(
    (pass) => pass.bookingId !== null,
  );
  return spentGuestPass && next !== undefined
    ? describe(next, true)
    : describe(active, false);
};
