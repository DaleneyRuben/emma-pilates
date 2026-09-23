const hour = 60 * 60 * 1_000;
const day = 24 * hour;

// Provisional windows (BE-008) until BE-007 settles data governance; each is
// longer than any use the row still has, and audit records are never swept.
// - Idempotency records: past their command's own expiry and at least 48 h
//   old, the longest supported client-retry window (ADR-0060).
// - Authentication Sessions: 90 days after they became unusable (revoked, idle,
//   or absolute expiry), keeping sign-in history for incident review.
// - Throttle events: 30 days after they stopped counting.
// - Notifications: 180 days after being read; unread ones stay.
export const retentionWindows = {
  idempotencyMinimumAgeMs: 48 * hour,
  authenticationSessionAfterUnusableMs: 90 * day,
  throttleEventAfterExpiryMs: 30 * day,
  notificationAfterReadMs: 180 * day,
} as const;

export type RetentionCutoffs = {
  idempotencyExpiredBy: Date;
  idempotencyCreatedBefore: Date;
  authenticationSessionUnusableBefore: Date;
  throttleEventExpiredBefore: Date;
  notificationReadBefore: Date;
};

export const retentionCutoffs = (now: Date): RetentionCutoffs => {
  const before = (milliseconds: number) =>
    new Date(now.getTime() - milliseconds);
  return {
    idempotencyExpiredBy: now,
    idempotencyCreatedBefore: before(retentionWindows.idempotencyMinimumAgeMs),
    authenticationSessionUnusableBefore: before(
      retentionWindows.authenticationSessionAfterUnusableMs,
    ),
    throttleEventExpiredBefore: before(
      retentionWindows.throttleEventAfterExpiryMs,
    ),
    notificationReadBefore: before(retentionWindows.notificationAfterReadMs),
  };
};
