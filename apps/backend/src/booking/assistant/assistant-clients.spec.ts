import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import {
  ClientNotFoundError,
  listAssistantClientBookings,
  listAssistantClientHistory,
  quotePlansForClient,
  readClientOverview,
  recordAssistantCashPayment,
  searchClients,
} from './assistant-clients';

const staff = (
  role: 'assistant' | 'administrator' | 'trainer' | 'coordinator',
  branchIds: string[],
): AuthenticatedPrincipal => ({
  accountId: 'staff-account',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'staff', staffMemberId: 'staff-id', role, branchIds },
});
const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client', clientId: 'client-id' },
};
const assistant = staff('assistant', ['branch-centro']);
const now = new Date('2026-09-21T12:00:00.000Z');
const today = new Date('2026-09-21T00:00:00.000Z');

const clientRecord = {
  id: 'client-id',
  name: 'Lucía Fernández',
  email: 'lucia@example.com',
  phone: '+591 70011001',
  accountStatus: 'active' as const,
};
const sessionFacts = (id: string, branchId: string, startsAt: string) => ({
  sessionId: id,
  branchId,
  classTypeName: 'Reformer Pilates',
  trainerName: 'Emma Vargas',
  branchName: 'Centro',
  startsAt: new Date(startsAt),
  endsAt: new Date(new Date(startsAt).getTime() + 50 * 60_000),
});
const upcoming = [
  {
    kind: 'booking' as const,
    bookingId: 'booking-1',
    ...sessionFacts('session-1', 'branch-centro', '2026-09-22T22:30:00.000Z'),
  },
  {
    kind: 'waitlist' as const,
    waitlistEntryId: 'entry-1',
    ...sessionFacts('session-2', 'branch-urubo', '2026-09-23T13:00:00.000Z'),
  },
];
const history = [1, 2, 3].map((index) => ({
  bookingId: `booking-${index}`,
  ...sessionFacts(
    `past-${index}`,
    'branch-centro',
    `2026-09-1${index}T13:00:00.000Z`,
  ),
}));
const subscription = {
  id: 'subscription-1',
  planName: 'Paquete de 8 clases',
  originalClassAllowance: 8,
  remainingClassAllowance: 5,
  startsOn: new Date('2026-09-10T00:00:00.000Z'),
  endsOn: new Date('2026-10-10T00:00:00.000Z'),
};
const plans = [
  {
    id: 'plan-8',
    name: 'Paquete de 8 clases',
    durationMonths: 1,
    classAllowance: 8,
    priceCentavos: 56_000,
    displayOrder: 1,
  },
  {
    id: 'plan-1',
    name: 'Clase suelta',
    durationMonths: 1,
    classAllowance: 1,
    priceCentavos: 5_000,
    displayOrder: 0,
  },
];

describe('Assistant Client search', () => {
  const search = jest.fn().mockResolvedValue([clientRecord]);

  it('searches by the trimmed text for Assistants and Administrators', async () => {
    await expect(
      searchClients({ query: '  Luc  ' }, { principal: assistant, search }),
    ).resolves.toEqual([clientRecord]);
    expect(search).toHaveBeenCalledWith({ query: 'Luc', limit: 20 });

    await expect(
      searchClients(
        { query: '7001' },
        { principal: staff('administrator', []), search },
      ),
    ).resolves.toEqual([clientRecord]);
  });

  it('denies Clients and Trainers', async () => {
    await expect(
      searchClients({ query: 'Luc' }, { principal: client, search }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    await expect(
      searchClients(
        { query: 'Luc' },
        { principal: staff('trainer', ['branch-centro']), search },
      ),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});

describe('Assistant Client overview', () => {
  const dependencies = {
    principal: assistant,
    today,
    now: () => now,
    findClient: jest.fn().mockResolvedValue(clientRecord),
    findActiveSubscription: jest.fn().mockResolvedValue(subscription),
    findLatestSubscription: jest.fn().mockResolvedValue(null),
    findUpcoming: jest.fn().mockResolvedValue(upcoming),
    findAttendedBookings: jest.fn().mockResolvedValue(history),
  };

  it('composes the Client, Subscription state, next Booking, last two attended classes, and no Credit (PAY-005)', async () => {
    await expect(
      readClientOverview({ clientId: 'client-id' }, dependencies),
    ).resolves.toEqual({
      client: clientRecord,
      subscription: { status: 'active', subscription },
      nextBooking: upcoming[0],
      recentHistory: history.slice(0, 2),
      creditAvailableCentavos: 0,
    });
    expect(dependencies.findActiveSubscription).toHaveBeenCalledWith(
      'client-id',
      today,
    );
    expect(dependencies.findUpcoming).toHaveBeenCalledWith({
      clientId: 'client-id',
      from: now,
    });
  });

  it('shows the Coordinator the same overview with Credit retired (ADR-0102)', async () => {
    await expect(
      readClientOverview(
        { clientId: 'client-id' },
        {
          ...dependencies,
          principal: staff('coordinator', []),
        },
      ),
    ).resolves.toEqual({
      client: clientRecord,
      subscription: { status: 'active', subscription },
      nextBooking: upcoming[0],
      recentHistory: history.slice(0, 2),
      creditAvailableCentavos: 0,
    });
  });

  it('reports a missing Client', async () => {
    await expect(
      readClientOverview(
        { clientId: 'missing' },
        { ...dependencies, findClient: jest.fn().mockResolvedValue(null) },
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it('denies Clients', async () => {
    await expect(
      readClientOverview(
        { clientId: 'client-id' },
        { ...dependencies, principal: client },
      ),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});

describe('Assistant Client Bookings and history', () => {
  it('lists every upcoming item and marks the ones at an assigned Branch actionable', async () => {
    await expect(
      listAssistantClientBookings(
        { clientId: 'client-id' },
        {
          principal: assistant,
          now: () => now,
          findClient: jest.fn().mockResolvedValue(clientRecord),
          findUpcoming: jest.fn().mockResolvedValue(upcoming),
        },
      ),
    ).resolves.toEqual([
      { ...upcoming[0], actionable: true },
      { ...upcoming[1], actionable: false },
    ]);
  });

  it('lets an Administrator act everywhere', async () => {
    await expect(
      listAssistantClientBookings(
        { clientId: 'client-id' },
        {
          principal: staff('administrator', []),
          now: () => now,
          findClient: jest.fn().mockResolvedValue(clientRecord),
          findUpcoming: jest.fn().mockResolvedValue(upcoming),
        },
      ),
    ).resolves.toEqual(upcoming.map((item) => ({ ...item, actionable: true })));
  });

  it('lets the Coordinator search Clients and act on their Bookings at every Branch (ADR-0102)', async () => {
    const coordinator = staff('coordinator', []);
    await expect(
      searchClients(
        { query: 'Luc' },
        { principal: coordinator, search: jest.fn().mockResolvedValue([]) },
      ),
    ).resolves.toEqual([]);
    await expect(
      listAssistantClientBookings(
        { clientId: 'client-id' },
        {
          principal: coordinator,
          now: () => now,
          findClient: jest.fn().mockResolvedValue(clientRecord),
          findUpcoming: jest.fn().mockResolvedValue(upcoming),
        },
      ),
    ).resolves.toEqual(upcoming.map((item) => ({ ...item, actionable: true })));
    await expect(
      listAssistantClientHistory(
        { clientId: 'client-id' },
        {
          principal: coordinator,
          findClient: jest.fn().mockResolvedValue(clientRecord),
          findAttendedBookings: jest.fn().mockResolvedValue(history),
        },
      ),
    ).resolves.toEqual(history);
  });

  it('lists the attended classes of the Client', async () => {
    const findAttendedBookings = jest.fn().mockResolvedValue(history);
    await expect(
      listAssistantClientHistory(
        { clientId: 'client-id' },
        {
          principal: assistant,
          findClient: jest.fn().mockResolvedValue(clientRecord),
          findAttendedBookings,
        },
      ),
    ).resolves.toEqual(history);
    expect(findAttendedBookings).toHaveBeenCalledWith('client-id');
  });

  it('reports a missing Client before listing', async () => {
    await expect(
      listAssistantClientHistory(
        { clientId: 'missing' },
        {
          principal: assistant,
          findClient: jest.fn().mockResolvedValue(null),
          findAttendedBookings: jest.fn(),
        },
      ),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });
});

describe('Assistant Plan quotes and cash Payment', () => {
  it('quotes every visible Plan at its full price in display order, since Credit is retired (PAY-005)', async () => {
    await expect(
      quotePlansForClient(
        { clientId: 'client-id' },
        {
          principal: assistant,
          findClient: jest.fn().mockResolvedValue(clientRecord),
          listVisiblePlans: jest.fn().mockResolvedValue(plans),
        },
      ),
    ).resolves.toEqual({
      creditAvailableCentavos: 0,
      plans: [
        {
          ...plans[1],
          creditAppliedCentavos: 0,
          amountDueCentavos: plans[1].priceCentavos,
        },
        {
          ...plans[0],
          creditAppliedCentavos: 0,
          amountDueCentavos: plans[0].priceCentavos,
        },
      ],
    });
  });

  it('never quotes prices to the Coordinator, who does not sell (ADR-0102)', async () => {
    await expect(
      quotePlansForClient(
        { clientId: 'client-id' },
        {
          principal: staff('coordinator', []),
          findClient: jest.fn().mockResolvedValue(clientRecord),
          listVisiblePlans: jest.fn().mockResolvedValue(plans),
        },
      ),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });

  it('records the cash Payment and returns the activated Subscription', async () => {
    const payment = {
      id: 'payment-1',
      method: 'cash' as const,
      state: 'confirmed' as const,
      planId: 'plan-8',
      planName: 'Paquete de 8 clases',
      durationMonths: 1,
      classAllowance: 8,
      planPriceCentavos: 56_000,
      creditAppliedCentavos: 6_000,
      amountDueCentavos: 50_000,
      submittedAt: now,
      decidedAt: now,
      rejectionReason: null,
      subscriptionId: 'subscription-2',
    };
    const recordCashPayment = jest.fn().mockResolvedValue(payment);
    const activated = { ...subscription, id: 'subscription-2' };

    await expect(
      recordAssistantCashPayment(
        {
          clientId: 'client-id',
          planId: 'plan-8',
          branchId: 'branch-centro',
          idempotencyKey: 'idempotency-key',
        },
        {
          principal: assistant,
          recordCashPayment,
          findLatestSubscription: jest.fn().mockResolvedValue(activated),
        },
      ),
    ).resolves.toEqual({ payment, subscription: activated });
    expect(recordCashPayment).toHaveBeenCalledWith(
      { clientId: 'client-id', planId: 'plan-8', branchId: 'branch-centro' },
      assistant,
      'idempotency-key',
    );
  });
});
