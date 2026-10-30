import { boliviaDate } from '../../time/bolivia-time';
import {
  classesInsideFirstDays,
  hasBookedSince,
  isWithinFirstNinetyDays,
  shouldOpenFewerThan2ByDay15,
  shouldOpenFewerThan4InFirst30Days,
  shouldOpenNoBooking7Days,
  shouldReopenNoBooking7Days,
} from './first-90-days-alerts';

const startsOn = new Date('2026-10-01T00:00:00.000Z');

describe('first-90-days contact alerts', () => {
  it('keeps the Client in the window through the Bolivia day 90', () => {
    expect(
      isWithinFirstNinetyDays(startsOn, new Date('2026-12-30T00:00:00.000Z')),
    ).toBe(true);
    expect(
      isWithinFirstNinetyDays(startsOn, new Date('2026-12-31T00:00:00.000Z')),
    ).toBe(false);
  });

  it('opens the 7-day alert when nothing was booked in 7 days and nothing is ahead', () => {
    expect(
      shouldOpenNoBooking7Days({
        startsOn,
        today: new Date('2026-10-08T00:00:00.000Z'),
        lastBookedOn: null,
        hasUpcomingBooking: false,
      }),
    ).toBe(true);
  });

  it('does not open the 7-day alert before 7 days, with a recent booking, or with a class ahead', () => {
    expect(
      shouldOpenNoBooking7Days({
        startsOn,
        today: new Date('2026-10-07T00:00:00.000Z'),
        lastBookedOn: null,
        hasUpcomingBooking: false,
      }),
    ).toBe(false);
    expect(
      shouldOpenNoBooking7Days({
        startsOn,
        today: new Date('2026-10-08T00:00:00.000Z'),
        lastBookedOn: new Date('2026-10-02T00:00:00.000Z'),
        hasUpcomingBooking: false,
      }),
    ).toBe(false);
    expect(
      shouldOpenNoBooking7Days({
        startsOn,
        today: new Date('2026-10-08T00:00:00.000Z'),
        lastBookedOn: null,
        hasUpcomingBooking: true,
      }),
    ).toBe(false);
  });

  it('opens the 7-day alert 7 days after the last booking', () => {
    expect(
      shouldOpenNoBooking7Days({
        startsOn,
        today: new Date('2026-10-10T00:00:00.000Z'),
        lastBookedOn: new Date('2026-10-03T00:00:00.000Z'),
        hasUpcomingBooking: false,
      }),
    ).toBe(true);
  });

  it('uses the Bolivia day of the last booking, not UTC midnight of the instant', () => {
    const lastBookedOn = boliviaDate(new Date('2026-10-03T03:30:00.000Z'));
    expect(lastBookedOn).toEqual(new Date('2026-10-02T00:00:00.000Z'));
    expect(
      shouldOpenNoBooking7Days({
        startsOn,
        today: new Date('2026-10-09T00:00:00.000Z'),
        lastBookedOn,
        hasUpcomingBooking: false,
      }),
    ).toBe(true);
    expect(
      shouldOpenNoBooking7Days({
        startsOn,
        today: new Date('2026-10-08T00:00:00.000Z'),
        lastBookedOn,
        hasUpcomingBooking: false,
      }),
    ).toBe(false);
  });

  it('opens the day-15 risk when fewer than 2 classes are booked', () => {
    expect(
      shouldOpenFewerThan2ByDay15({
        startsOn,
        today: new Date('2026-10-16T00:00:00.000Z'),
        bookedClassCount: 1,
      }),
    ).toBe(true);
    expect(
      shouldOpenFewerThan2ByDay15({
        startsOn,
        today: new Date('2026-10-16T00:00:00.000Z'),
        bookedClassCount: 2,
      }),
    ).toBe(false);
    expect(
      shouldOpenFewerThan2ByDay15({
        startsOn,
        today: new Date('2026-10-15T00:00:00.000Z'),
        bookedClassCount: 1,
      }),
    ).toBe(false);
  });

  it('opens the first-month alert when fewer than 4 classes are booked by day 30', () => {
    expect(
      shouldOpenFewerThan4InFirst30Days({
        startsOn,
        today: new Date('2026-10-31T00:00:00.000Z'),
        bookedClassCount: 3,
      }),
    ).toBe(true);
    expect(
      shouldOpenFewerThan4InFirst30Days({
        startsOn,
        today: new Date('2026-10-31T00:00:00.000Z'),
        bookedClassCount: 4,
      }),
    ).toBe(false);
  });

  it('does not open alerts after the first 90 days', () => {
    const after = new Date('2026-12-31T00:00:00.000Z');
    expect(
      shouldOpenNoBooking7Days({
        startsOn,
        today: after,
        lastBookedOn: null,
        hasUpcomingBooking: false,
      }),
    ).toBe(false);
    expect(
      shouldOpenFewerThan2ByDay15({
        startsOn,
        today: after,
        bookedClassCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldOpenFewerThan4InFirst30Days({
        startsOn,
        today: after,
        bookedClassCount: 0,
      }),
    ).toBe(false);
  });

  it('reopens the 7-day alert only after a new stretch that starts with a booking', () => {
    expect(
      shouldReopenNoBooking7Days({
        conditionsHold: true,
        openUncontacted: false,
        lastContactedAt: null,
        lastBookedAt: null,
      }),
    ).toBe(true);
    expect(
      shouldReopenNoBooking7Days({
        conditionsHold: true,
        openUncontacted: true,
        lastContactedAt: null,
        lastBookedAt: null,
      }),
    ).toBe(false);
    expect(
      shouldReopenNoBooking7Days({
        conditionsHold: true,
        openUncontacted: false,
        lastContactedAt: new Date('2026-10-08T12:00:00.000Z'),
        lastBookedAt: null,
      }),
    ).toBe(false);
    expect(
      shouldReopenNoBooking7Days({
        conditionsHold: true,
        openUncontacted: false,
        lastContactedAt: new Date('2026-10-08T12:00:00.000Z'),
        lastBookedAt: new Date('2026-10-09T12:00:00.000Z'),
      }),
    ).toBe(true);
  });

  it('counts a class toward day 15 only when it starts inside the first 15 days', () => {
    expect(
      classesInsideFirstDays(
        startsOn,
        15,
        [
          new Date('2026-10-10T15:00:00.000Z'),
          new Date('2026-10-20T15:00:00.000Z'),
        ],
      ),
    ).toBe(1);
  });

  it('counts a class toward the first 30 days only when it starts inside them', () => {
    expect(
      classesInsideFirstDays(
        startsOn,
        30,
        [
          new Date('2026-10-20T15:00:00.000Z'),
          new Date('2026-11-05T15:00:00.000Z'),
        ],
      ),
    ).toBe(1);
  });

  it('treats a Client as having booked since an alert when a live Booking is newer', () => {
    const openedAt = new Date('2026-10-08T12:00:00.000Z');
    expect(
      hasBookedSince(openedAt, [new Date('2026-10-08T12:00:01.000Z')]),
    ).toBe(true);
    expect(
      hasBookedSince(openedAt, [new Date('2026-10-08T11:59:59.000Z')]),
    ).toBe(false);
  });
});
