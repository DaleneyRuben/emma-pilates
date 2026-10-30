import { dateTriggeredPushInstant } from './date-triggered-push';

describe('date-triggered push instant', () => {
  it('holds a midnight sweep until 09:00 La Paz and stamps that morning', () => {
    // 00:30 La Paz is 04:30 UTC.
    expect(
      dateTriggeredPushInstant(new Date('2026-10-23T04:30:00.000Z')),
    ).toBeNull();
    // 09:00 La Paz is 13:00 UTC.
    expect(
      dateTriggeredPushInstant(new Date('2026-10-23T13:00:00.000Z')),
    ).toEqual(new Date('2026-10-23T13:00:00.000Z'));
    expect(
      dateTriggeredPushInstant(new Date('2026-10-23T18:00:00.000Z')),
    ).toEqual(new Date('2026-10-23T13:00:00.000Z'));
  });
});
