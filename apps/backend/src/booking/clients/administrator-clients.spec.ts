import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import {
  listAdministratorClients,
  readAdministratorClient,
  type AdministratorClientDirectory,
} from './administrator-clients';

const staff = (
  role: 'assistant' | 'administrator' | 'trainer' | 'nutritionist',
): AuthenticatedPrincipal => ({
  accountId: 'staff-account',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: 'staff-id',
    role,
    branchIds: role === 'administrator' ? [] : ['branch-centro'],
  },
});
const administrator = staff('administrator');
const clientPrincipal: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client', clientId: 'client-id' },
};

const now = new Date('2026-09-22T02:30:00.000Z'); // 21 Sep, 22:30 in Bolivia
const today = new Date('2026-09-21T00:00:00.000Z');

const lucia = {
  id: 'client-id',
  name: 'Lucía Fernández',
  email: 'lucia@example.com',
  phone: '+591 70011001',
  accountStatus: 'active' as const,
  clientSince: new Date('2025-07-03T00:00:00.000Z'),
  referralCode: 'LUCIA25',
  referredClientCount: 3,
};
const subscription = {
  id: 'subscription-1',
  planName: 'Paquete de 8 clases',
  originalClassAllowance: 8,
  remainingClassAllowance: 5,
  startsOn: new Date('2026-09-01T00:00:00.000Z'),
  endsOn: new Date('2026-09-30T00:00:00.000Z'),
};
const emptyPage = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  studioClientCount: 0,
  activePlanClientCount: 0,
};

const directory = (
  overrides: Partial<AdministratorClientDirectory> = {},
): AdministratorClientDirectory => ({
  list: jest.fn().mockResolvedValue(emptyPage),
  read: jest.fn().mockResolvedValue(lucia),
  findActiveSubscription: jest.fn().mockResolvedValue(subscription),
  findLatestSubscription: jest.fn().mockResolvedValue(subscription),
  readAvailableCredit: jest.fn().mockResolvedValue(105_000),
  ...overrides,
});

describe('Administrator Client directory', () => {
  it('pages every Client for an Administrator with the Bolivia date and a trimmed search', async () => {
    const clients = directory();

    await expect(
      listAdministratorClients(
        { page: 2, pageSize: 10, query: '  lucia  ' },
        administrator,
        { directory: clients, now: () => now },
      ),
    ).resolves.toEqual(emptyPage);
    expect(clients.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      query: 'lucia',
      today,
    });
  });

  it('treats a blank search as no search', async () => {
    const clients = directory();

    await listAdministratorClients(
      { page: 1, pageSize: 20, query: '   ' },
      administrator,
      { directory: clients, now: () => now },
    );
    expect(clients.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      today,
    });
  });

  it.each([
    ['an Assistant', staff('assistant')],
    ['a Trainer', staff('trainer')],
    ['the Nutritionist', staff('nutritionist')],
    ['a Client', clientPrincipal],
  ])('keeps Client data from %s (ADR-0054)', async (_who, principal) => {
    const clients = directory();

    await expect(
      listAdministratorClients({ page: 1, pageSize: 20 }, principal, {
        directory: clients,
        now: () => now,
      }),
    ).rejects.toEqual(new AdministrationError('administration_access_denied'));
    await expect(
      readAdministratorClient({ clientId: 'client-id' }, principal, {
        directory: clients,
        now: () => now,
      }),
    ).rejects.toEqual(new AdministrationError('administration_access_denied'));
    expect(clients.list).not.toHaveBeenCalled();
    expect(clients.read).not.toHaveBeenCalled();
  });
});

describe('Administrator Client detail', () => {
  it('summarizes contact, the current Plan, Credit, and referrals', async () => {
    const clients = directory();

    await expect(
      readAdministratorClient({ clientId: 'client-id' }, administrator, {
        directory: clients,
        now: () => now,
      }),
    ).resolves.toEqual({
      ...lucia,
      subscription: { status: 'active', subscription },
      creditAvailableCentavos: 105_000,
    });
    expect(clients.findActiveSubscription).toHaveBeenCalledWith(
      'client-id',
      today,
    );
  });

  it('names the last expired Plan when none is active', async () => {
    const expired = {
      ...subscription,
      endsOn: new Date('2026-06-30T00:00:00.000Z'),
    };
    const clients = directory({
      findActiveSubscription: jest.fn().mockResolvedValue(null),
      findLatestSubscription: jest.fn().mockResolvedValue(expired),
      readAvailableCredit: jest.fn().mockResolvedValue(0),
    });

    await expect(
      readAdministratorClient({ clientId: 'client-id' }, administrator, {
        directory: clients,
        now: () => now,
      }),
    ).resolves.toMatchObject({
      subscription: { status: 'expired', subscription: expired },
      creditAvailableCentavos: 0,
    });
  });

  it('answers client_not_found for an unknown Client', async () => {
    const clients = directory({ read: jest.fn().mockResolvedValue(null) });

    await expect(
      readAdministratorClient({ clientId: 'missing' }, administrator, {
        directory: clients,
        now: () => now,
      }),
    ).rejects.toEqual(new AdministrationError('client_not_found'));
  });
});
