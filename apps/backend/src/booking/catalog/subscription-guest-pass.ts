// Walkthrough n.º 56: Mi plan tells a Guest Pass's hidden Subscription apart
// from a Plan with no classes left, and says when its class was used.
// Walkthrough n.º 19 (C02f): and who invited her, «Te invitó Lucía».
export const guestPassSelect = {
  where: { deletedAt: null },
  select: {
    booking: { select: { session: { select: { startsAt: true } } } },
    host: { select: { name: true } },
  },
} as const;

export type GuestPassRow = {
  booking: { session: { startsAt: Date } } | null;
  host: { name: string };
};

export type GuestPassFacts = {
  usedClassStartsAt: Date | null;
  hostName: string;
};

export const toGuestPass = (
  rows: readonly GuestPassRow[],
): GuestPassFacts | null =>
  rows[0] === undefined
    ? null
    : {
        usedClassStartsAt: rows[0].booking?.session.startsAt ?? null,
        hostName: rows[0].host.name,
      };
