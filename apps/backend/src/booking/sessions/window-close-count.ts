// The snapshot is the live Bookings at the instant the window closed. A
// cancellation after that instant still counted then, so a late sweep adds
// it back.
export const bookingsAtClose = (input: {
  startsAt: Date;
  windowMinutes: number;
  now: Date;
  liveCount: number;
  cancelledAfterClose: number;
}): number => {
  const closedAt = input.startsAt.getTime() - input.windowMinutes * 60_000;
  if (input.now.getTime() <= closedAt) return input.liveCount;
  return input.liveCount + input.cancelledAfterClose;
};
