export const bookingsAtClose = (input: {
  startsAt: Date;
  windowMinutes: number;
  now: Date;
  liveCount: number;
  cancelledAfterClose: number;
}): number => input.liveCount;