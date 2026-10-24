import {
  monthKpis,
  type ClientMonthInput,
  type SessionFactInput,
} from './month-kpis';

const session = (overrides: Partial<SessionFactInput>): SessionFactInput => ({
  capacity: 0,
  bookingsAtWindowClose: 0,
  attended: 0,
  noShows: 0,
  ...overrides,
});

const clientMonth = (
  clientId: string,
  overrides: Partial<ClientMonthInput> = {},
): ClientMonthInput => ({
  clientId,
  month: '2026-10',
  planDays: 0,
  renewed: false,
  ...overrides,
});

describe('month kpis', () => {
  it('computes occupancy, averages, no-shows, and renewal from the worked example', () => {
    // Two held sessions, capacities 12 and 10, bookings 8 and 5, attended
    // 7 and 4, no-shows 1 and 1. Occupancy is round(100 * 13 / 22) = 59.
    // Average students is 13 / 2 = 6.5, so times10 is 65; attendance is
    // 11 / 2 = 5.5, so times10 is 55. No-show is round(100 * 2 / 13) = 15.
    const result = monthKpis({
      sessions: [
        session({
          capacity: 12,
          bookingsAtWindowClose: 8,
          attended: 7,
          noShows: 1,
        }),
        session({
          capacity: 10,
          bookingsAtWindowClose: 5,
          attended: 4,
          noShows: 1,
        }),
      ],
      clientMonths: [
        clientMonth('ana', { planDays: 30, renewed: true }),
        clientMonth('bea', { planDays: 12, renewed: false }),
        clientMonth('luz', { planDays: 0, renewed: false }),
      ],
      earlierActiveClientIds: [],
    });

    expect(result.sessionsHeld).toBe(2);
    expect(result.occupancyPercent).toBe(59);
    expect(result.averageStudentsTimes10).toBe(65);
    expect(result.averageAttendanceTimes10).toBe(55);
    expect(result.noShowPercent).toBe(15);
    expect(result.activeClients).toBe(2);
    expect(result.renewedClients).toBe(1);
    expect(result.renewalPercent).toBe(50);
  });

  it('counts a client as new only when no earlier month had plan days', () => {
    const result = monthKpis({
      sessions: [],
      clientMonths: [
        clientMonth('ana', { planDays: 30 }),
        clientMonth('bea', { planDays: 8 }),
        clientMonth('luz', { planDays: 0 }),
      ],
      earlierActiveClientIds: ['bea'],
    });

    expect(result.newClients).toBe(1);
    expect(result.activeClients).toBe(2);
  });

  it('returns zero percents and zero averages when the denominators are empty', () => {
    const result = monthKpis({
      sessions: [session({ capacity: 0, bookingsAtWindowClose: 0 })],
      clientMonths: [clientMonth('luz', { planDays: 0, renewed: true })],
      earlierActiveClientIds: [],
    });

    expect(result.sessionsHeld).toBe(1);
    expect(result.occupancyPercent).toBe(0);
    expect(result.averageStudentsTimes10).toBe(0);
    expect(result.averageAttendanceTimes10).toBe(0);
    expect(result.noShowPercent).toBe(0);
    expect(result.activeClients).toBe(0);
    expect(result.renewedClients).toBe(0);
    expect(result.renewalPercent).toBe(0);
    expect(result.newClients).toBe(0);
  });
});
