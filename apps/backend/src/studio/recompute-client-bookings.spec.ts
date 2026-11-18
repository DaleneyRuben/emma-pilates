import { recomputeFacts, type FactSession } from './recompute-facts';

const month = new Date('2026-11-01T00:00:00.000Z');
const now = new Date('2026-11-18T15:00:00.000Z');
const lucia = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const session = (id: string, overrides: Partial<FactSession>): FactSession => ({
  id,
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

const monthOf = (sessions: FactSession[]) =>
  recomputeFacts(
    {
      sessions,
      clients: [
        {
          id: lucia,
          planDays: 18,
          renewed: false,
          excludedFromAnalytics: false,
        },
      ],
    },
    month,
    now,
  ).clientMonths[0];

// Walkthrough finding 108: a Client whose classes the studio cancelled did
// book; she is not an inactive Client.
describe('a client month counts the bookings the studio cancelled', () => {
  it('counts a booking released because its class was cancelled', () => {
    const row = monthOf([
      session('s1', {
        bookings: [
          {
            clientId: lucia,
            state: 'cancelled',
            outcome: null,
            cancelledWithSession: true,
          },
        ],
      }),
      session('s2', {
        cancellationCause: 'no_substitute_trainer',
        bookings: [
          {
            clientId: lucia,
            state: 'cancelled',
            outcome: null,
            cancelledWithSession: true,
          },
        ],
      }),
    ]);

    expect(row?.classesBooked).toBe(2);
    expect(row?.classesAttended).toBe(0);
  });

  it('still leaves out a booking she cancelled herself', () => {
    const row = monthOf([
      session('s1', {
        state: 'scheduled',
        cancellationCause: null,
        bookings: [
          {
            clientId: lucia,
            state: 'cancelled',
            outcome: null,
            cancelledWithSession: false,
          },
        ],
      }),
    ]);

    expect(row?.classesBooked).toBe(0);
  });
});
