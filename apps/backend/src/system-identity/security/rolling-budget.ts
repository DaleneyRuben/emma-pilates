export type RollingLimit = { windowMilliseconds: number; allowed: number };

/**
 * Seconds until another event fits every rolling limit, or 0 when each has
 * room: a full window waits for enough of its oldest events to leave it.
 */
export const rollingBudgetWaitSeconds = (
  occurredAt: readonly Date[],
  now: Date,
  limits: readonly RollingLimit[],
): number => {
  const waits = limits.map(({ windowMilliseconds, allowed }) => {
    const inWindow = occurredAt
      .map((time) => time.getTime())
      .filter((time) => time > now.getTime() - windowMilliseconds)
      .sort((left, right) => left - right);

    if (inWindow.length < allowed) {
      return 0;
    }

    const leaving = inWindow[inWindow.length - allowed];
    return leaving + windowMilliseconds - now.getTime();
  });

  return Math.ceil(Math.max(0, ...waits) / 1_000);
};
