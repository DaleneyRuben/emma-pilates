import { boliviaDate } from '../../time/bolivia-time';
import { dueMilestones, isMilestoneDue } from './first-90-days-milestones';

const startsOn = new Date('2026-10-01T00:00:00.000Z');

describe('first-90-days lifecycle milestones', () => {
  it('becomes due on the Bolivia calendar day of each offset after the start', () => {
    expect(
      isMilestoneDue('day_2', startsOn, new Date('2026-10-03T00:00:00.000Z')),
    ).toBe(true);
    expect(
      isMilestoneDue('week_1', startsOn, new Date('2026-10-08T00:00:00.000Z')),
    ).toBe(true);
    expect(
      isMilestoneDue('day_30', startsOn, new Date('2026-10-31T00:00:00.000Z')),
    ).toBe(true);
    expect(
      isMilestoneDue('day_90', startsOn, new Date('2026-12-30T00:00:00.000Z')),
    ).toBe(true);
  });

  it('stays on the previous Bolivia day before 04:00 UTC', () => {
    const beforeMidnight = boliviaDate(new Date('2026-10-03T03:30:00.000Z'));
    const atMidnight = boliviaDate(new Date('2026-10-03T04:00:00.000Z'));

    expect(isMilestoneDue('day_2', startsOn, beforeMidnight)).toBe(false);
    expect(isMilestoneDue('day_2', startsOn, atMidnight)).toBe(true);
  });

  it('lists every due milestone that has not already been sent', () => {
    expect(
      dueMilestones(startsOn, new Date('2026-10-08T00:00:00.000Z'), new Set()),
    ).toEqual(['day_2', 'week_1']);
    expect(
      dueMilestones(
        startsOn,
        new Date('2026-12-30T00:00:00.000Z'),
        new Set(['day_2', 'week_1']),
      ),
    ).toEqual(['day_30', 'day_90']);
  });

  it('sends only the latest missed milestone after downtime, so a catch-up is not a burst', () => {
    expect(
      dueMilestones(startsOn, new Date('2026-12-30T00:00:00.000Z'), new Set()),
    ).toEqual(['day_2', 'week_1', 'day_30', 'day_90']);
    expect(
      dueMilestones(startsOn, new Date('2026-10-31T00:00:00.000Z'), new Set()),
    ).toEqual(['day_2', 'week_1', 'day_30']);
  });
});
