import { AssistantClientsController } from './assistant.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const clientId = '11111111-1111-4111-8111-111111111111';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff' as const,
    role: 'assistant' as const,
    staffMemberId: 'staff-id',
    branchIds: [],
  },
};

const subscription = {
  id: 'subscription-id',
  planName: 'Paquete de 8 clases',
  originalClassAllowance: 8,
  remainingClassAllowance: 5,
  startsOn: new Date('2026-09-12T00:00:00.000Z'),
  endsOn: new Date('2026-10-12T00:00:00.000Z'),
};

describe('Assistant client overview', () => {
  const overview = jest.fn();
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const controller = new AssistantClientsController(
    {
      search: jest.fn(),
      overview,
      bookings: jest.fn(),
      history: jest.fn(),
      planQuotes: jest.fn(),
      recordCashPayment: jest.fn(),
      recordFrontDeskTransfer: jest.fn(),
    },
    resolvePrincipal,
  );

  it('passes on the fixed renewal start and omits it when she chooses the date', async () => {
    overview.mockResolvedValue({
      client: {
        id: clientId,
        name: 'Lucía Fernández',
        email: 'lucia@example.com',
        phone: null,
        accountStatus: 'active',
      },
      subscription: {
        status: 'active',
        subscription,
        nextSubscription: null,
        founderRenewalDeadline: null,
        freeze: null,
        canRequestFreeze: false,
        renewalStartsOn: '2026-10-13',
      },
      nextBooking: null,
      recentHistory: [],
      creditAvailableCentavos: 0,
    });

    await expect(controller.overview(clientId, bearer)).resolves.toMatchObject({
      subscription: { renewalStartsOn: '2026-10-13' },
    });

    overview.mockResolvedValue({
      client: {
        id: clientId,
        name: 'Lucía Fernández',
        email: 'lucia@example.com',
        phone: null,
        accountStatus: 'active',
      },
      subscription: {
        status: 'expired',
        subscription,
        nextSubscription: null,
        founderRenewalDeadline: null,
        freeze: null,
        canRequestFreeze: false,
      },
      nextBooking: null,
      recentHistory: [],
      creditAvailableCentavos: 0,
    });

    const chosen = await controller.overview(clientId, bearer);
    expect(chosen.subscription).not.toHaveProperty('renewalStartsOn');
  });
});
