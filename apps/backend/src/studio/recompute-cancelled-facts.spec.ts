import { recomputeFacts, type FactSession } from './recompute-facts';

const month = new Date('2026-11-01T00:00:00.000Z');
const now = new Date('2026-11-18T15:00:00.000Z');

const session = (overrides: Partial<FactSession>): FactSession => ({
  id: '11111111-1111-4111-8111-111111111111',
  branchId: 'branch',
  classTypeId: 'class-type',
  trainerStaffMemberId: 'trainer',
  startsAt: new Date('2026-11-03T20:00:00.000Z'),
  endsAt: new Date('2026-11-03T20:50:00.000Z'),
  capacity: 8,
  state: 'cancelled',
  cancellationCause: 'minimum_not_met',
  bookingsAtWindowClose: null,
  bookings: [],
  ...overrides,
});

// Walkthrough finding 107: a class cancelled for low demand is a fact of its
// own, so a weak schedule and the month question can count it.
describe('cancelled session facts', () => {
  it('keeps a class cancelled for the minimum with the bookings it held', () => {
    const facts = recomputeFacts(
      {
        sessions: [
          session({
            bookings: [
              {
                clientId: 'a',
                state: 'cancelled',
                outcome: null,
                cancelledWithSession: true,
              },
              {
                clientId: 'b',
                state: 'cancelled',
                outcome: null,
                cancelledWithSession: false,
              },
            ],
          }),
        ],
        clients: [],
      },
      month,
      now,
    );

    expect(facts.sessions).toEqual([]);
    expect(facts.cancelledSessions).toEqual([
      {
        sessionId: '11111111-1111-4111-8111-111111111111',
        sessionDate: new Date('2026-11-03T00:00:00.000Z'),
        branchId: 'branch',
        classTypeId: 'class-type',
        trainerStaffMemberId: 'trainer',
        cause: 'minimum_not_met',
        bookingsHeld: 1,
      },
    ]);
  });

  it('prefers the window-close snapshot and keeps zero-booking cancellations', () => {
    const facts = recomputeFacts(
      {
        sessions: [
          session({ bookingsAtWindowClose: 1 }),
          session({
            id: '22222222-2222-4222-8222-222222222222',
            cancellationCause: 'zero_bookings',
          }),
        ],
        clients: [],
      },
      month,
      now,
    );

    expect(
      facts.cancelledSessions.map((row) => [row.cause, row.bookingsHeld]),
    ).toEqual([
      ['minimum_not_met', 1],
      ['zero_bookings', 0],
    ]);
  });

  it('leaves out classes the studio cancelled by hand and other months', () => {
    const facts = recomputeFacts(
      {
        sessions: [
          session({ cancellationCause: 'no_substitute_trainer' }),
          session({
            id: '33333333-3333-4333-8333-333333333333',
            startsAt: new Date('2026-10-28T20:00:00.000Z'),
          }),
        ],
        clients: [],
      },
      month,
      now,
    );

    expect(facts.cancelledSessions).toEqual([]);
  });
});
