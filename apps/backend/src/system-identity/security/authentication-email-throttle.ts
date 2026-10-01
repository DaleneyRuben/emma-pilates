const minuteMilliseconds = 60 * 1_000;
const hourMilliseconds = 60 * minuteMilliseconds;
const dayMilliseconds = 24 * hourMilliseconds;

// ADR-0029 recipient-and-purpose lane for verification and activation email:
// one a minute, five in a rolling hour, ten in a rolling day.
const limits = [
  { windowMilliseconds: minuteMilliseconds, allowed: 1 },
  { windowMilliseconds: hourMilliseconds, allowed: 5 },
  { windowMilliseconds: dayMilliseconds, allowed: 10 },
];

/**
 * Seconds until the recipient may receive another email, or 0 when every
 * limit has room: each full window waits for enough of its oldest events
 * to leave it.
 */
export const authenticationEmailWaitSeconds = (
  events: readonly { occurredAt: Date }[],
  now: Date,
): number => {
  const waits = limits.map(({ windowMilliseconds, allowed }) => {
    const inWindow = events
      .map(({ occurredAt }) => occurredAt.getTime())
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
