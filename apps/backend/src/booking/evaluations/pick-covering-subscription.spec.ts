import { pickCoveringSubscription } from './pick-covering-subscription';

const today = new Date('2026-11-27T00:00:00.000Z');
const candidate = (id: string, courtesy: boolean, remaining = 4) => ({
  id,
  courtesy,
  endsOn: new Date('2026-12-31T00:00:00.000Z'),
  remainingClassAllowance: remaining,
  allowanceAdjustments: [],
  _count: { bookings: 0 },
});

// Owner, 2026-11-27: Courtesy Access covers an Evaluation, but a paid Plan
// covering the same date wins, so its included Evaluation is not lost.
describe('the Subscription that covers an Evaluation', () => {
  it('prefers an effective paid Plan over Courtesy Access', () => {
    expect(
      pickCoveringSubscription(
        [candidate('courtesy', true), candidate('paid', false)],
        today,
      )?.id,
    ).toBe('paid');
  });

  it('falls back to Courtesy Access when no paid Plan is in force', () => {
    expect(
      pickCoveringSubscription(
        [candidate('courtesy', true), candidate('paid', false, 0)],
        today,
      )?.id,
    ).toBe('courtesy');
  });

  it('answers null when nothing is in force', () => {
    expect(pickCoveringSubscription([], today)).toBeNull();
  });
});
