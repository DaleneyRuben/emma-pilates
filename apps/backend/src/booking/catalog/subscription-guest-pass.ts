// Walkthrough n.º 56: Mi plan tells a Guest Pass's hidden Subscription apart
// from a Plan with no classes left, and says when its class was used.
export const guestPassSelect = {
  where: { deletedAt: null },
  select: { booking: { select: { session: { select: { startsAt: true } } } } },
} as const;

export type GuestPassRow = {
  booking: { session: { startsAt: Date } } | null;
};

export const toGuestPass = (
  rows: readonly GuestPassRow[],
): { usedClassStartsAt: Date | null } | null =>
  rows[0] === undefined
    ? null
    : { usedClassStartsAt: rows[0].booking?.session.startsAt ?? null };
