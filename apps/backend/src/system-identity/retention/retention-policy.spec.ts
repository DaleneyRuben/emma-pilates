import { retentionCutoffs } from './retention-policy';

const hour = 60 * 60 * 1_000;
const day = 24 * hour;

describe('retentionCutoffs', () => {
  it('derives each provisional cutoff from the sweep instant', () => {
    const now = new Date('2026-09-23T12:00:00.000Z');

    expect(retentionCutoffs(now)).toEqual({
      idempotencyExpiredBy: now,
      idempotencyCreatedBefore: new Date(now.getTime() - 48 * hour),
      authenticationSessionUnusableBefore: new Date(now.getTime() - 90 * day),
      throttleEventExpiredBefore: new Date(now.getTime() - 30 * day),
      notificationReadBefore: new Date(now.getTime() - 180 * day),
    });
  });
});
