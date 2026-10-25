import {
  recomputeFacts,
  type ClientMonthFact,
  type FactSource,
  type SessionFact,
} from './recompute-facts';

const month = new Date('2026-10-01T00:00:00.000Z');
const sessionId = '11111111-1111-4111-8111-111111111111';
const emptySessionId = '22222222-2222-4222-8222-222222222222';
const otherMonthSessionId = '33333333-3333-4333-8333-333333333333';
const clientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const clientB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const clientC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const excludedClient = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const branchId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const classTypeId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const trainerId = '99999999-9999-4999-8999-999999999999';

const source = (): FactSource => ({
  sessions: [
    {
      id: sessionId,
      branchId,
      classTypeId,
      trainerStaffMemberId: trainerId,
      startsAt: new Date('2026-10-12T18:00:00.000Z'),
      capacity: 8,
      state: 'scheduled',
      bookings: [
        { clientId: clientA, state: 'booked', outcome: 'attended' },
        { clientId: clientB, state: 'booked', outcome: 'no_show' },
        { clientId: clientC, state: 'cancelled', outcome: null },
        { clientId: excludedClient, state: 'booked', outcome: 'attended' },
      ],
    },
    {
      id: emptySessionId,
      branchId,
      classTypeId,
      trainerStaffMemberId: trainerId,
      startsAt: new Date('2026-10-13T18:00:00.000Z'),
      capacity: 6,
      state: 'scheduled',
      bookings: [],
    },
    {
      id: otherMonthSessionId,
      branchId,
      classTypeId,
      trainerStaffMemberId: trainerId,
      startsAt: new Date('2026-09-30T18:00:00.000Z'),
      capacity: 8,
      state: 'scheduled',
      bookings: [{ clientId: clientA, state: 'booked', outcome: 'attended' }],
    },
  ],
  clients: [
    {
      id: clientA,
      planDays: 12,
      renewed: true,
      excludedFromAnalytics: false,
    },
    {
      id: clientB,
      planDays: 31,
      renewed: false,
      excludedFromAnalytics: false,
    },
    {
      id: clientC,
      planDays: 0,
      renewed: false,
      excludedFromAnalytics: false,
    },
    {
      id: excludedClient,
      planDays: 31,
      renewed: true,
      excludedFromAnalytics: true,
    },
  ],
});

describe('recompute facts', () => {
  it('writes one session fact per session in the month, including one with no bookings', () => {
    const facts: { sessions: SessionFact[]; clientMonths: ClientMonthFact[] } =
      recomputeFacts(source(), month);

    expect(facts.sessions).toEqual([
      {
        sessionId,
        sessionDate: new Date('2026-10-12T00:00:00.000Z'),
        branchId,
        classTypeId,
        trainerStaffMemberId: trainerId,
        capacity: 8,
        bookingsAtWindowClose: 2,
        attended: 1,
        noShows: 1,
      },
      {
        sessionId: emptySessionId,
        sessionDate: new Date('2026-10-13T00:00:00.000Z'),
        branchId,
        classTypeId,
        trainerStaffMemberId: trainerId,
        capacity: 6,
        bookingsAtWindowClose: 0,
        attended: 0,
        noShows: 0,
      },
    ]);
  });

  it('writes one client month fact per included client and counts only that month', () => {
    const facts: { sessions: SessionFact[]; clientMonths: ClientMonthFact[] } =
      recomputeFacts(source(), month);

    expect(facts.clientMonths).toEqual([
      {
        clientId: clientA,
        month,
        planDays: 12,
        classesBooked: 1,
        classesAttended: 1,
        renewed: true,
      },
      {
        clientId: clientB,
        month,
        planDays: 31,
        classesBooked: 1,
        classesAttended: 0,
        renewed: false,
      },
      {
        clientId: clientC,
        month,
        planDays: 0,
        classesBooked: 0,
        classesAttended: 0,
        renewed: false,
      },
    ]);
  });

  it('excludes a store-review client and their bookings through the exclusion seam', () => {
    const facts: { sessions: SessionFact[]; clientMonths: ClientMonthFact[] } =
      recomputeFacts(source(), month);

    expect(facts.sessions[0]?.bookingsAtWindowClose).toBe(2);
    expect(facts.clientMonths.map((row) => row.clientId)).not.toContain(
      excludedClient,
    );
  });

  it('returns the same rows when the same source is recomputed twice', () => {
    const first = recomputeFacts(source(), month);
    const second = recomputeFacts(source(), month);

    expect(second).toEqual(first);
  });
});
