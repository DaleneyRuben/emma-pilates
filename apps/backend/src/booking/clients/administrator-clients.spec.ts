import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import {
  exportAdministratorClients,
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
const outlook = {
  futureBookingCount: 3,
  activeWaitlistEntryCount: 1,
  upcomingEvaluationCount: 1,
  transferPaymentPending: false,
};
const emptyPage = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  studioClientCount: 0,
  activePlanClientCount: 0,
  founderClientCount: 0,
};

const directory = (
  overrides: Partial<AdministratorClientDirectory> = {},
): AdministratorClientDirectory => ({
  list: jest.fn().mockResolvedValue(emptyPage),
  read: jest.fn().mockResolvedValue(lucia),
  findActiveSubscription: jest.fn().mockResolvedValue(subscription),
  findLatestSubscription: jest.fn().mockResolvedValue(subscription),
  findFutureSubscription: jest.fn().mockResolvedValue(null),
  readClosureOutlook: jest.fn().mockResolvedValue(outlook),
  saveProfile: jest.fn(),
  recordExport: jest.fn().mockResolvedValue(undefined),
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
    // «Última clase» counts only classes that already started (FIX-091).
    expect(clients.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      query: 'lucia',
      today,
      now,
    });
  });

  it('hands the chosen chip to the directory (follow-up 232)', async () => {
    const clients = directory();

    await listAdministratorClients(
      { page: 1, pageSize: 20, filter: 'founder' },
      administrator,
      { directory: clients, now: () => now },
    );
    expect(clients.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      filter: 'founder',
      today,
      now,
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
      now,
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
  it('summarizes contact, the current Plan, and referrals, with Credit retired to zero (PAY-005)', async () => {
    const clients = directory();

    await expect(
      readAdministratorClient({ clientId: 'client-id' }, administrator, {
        directory: clients,
        now: () => now,
      }),
    ).resolves.toEqual({
      ...lucia,
      subscription: {
        status: 'active',
        subscription,
        nextSubscription: null,
        founderRenewalDeadline: null,
        freeze: null,
        canRequestFreeze: false,
      },
      creditAvailableCentavos: 0,
      closure: outlook,
    });
    expect(clients.findActiveSubscription).toHaveBeenCalledWith(
      'client-id',
      today,
    );
    // AW22's Cerrar cuenta dialog counts what is still ahead right now.
    expect(clients.readClosureOutlook).toHaveBeenCalledWith('client-id', now);
  });

  it('names the last expired Plan when none is active', async () => {
    const expired = {
      ...subscription,
      endsOn: new Date('2026-06-30T00:00:00.000Z'),
    };
    const clients = directory({
      findActiveSubscription: jest.fn().mockResolvedValue(null),
      findLatestSubscription: jest.fn().mockResolvedValue(expired),
    });

    await expect(
      readAdministratorClient({ clientId: 'client-id' }, administrator, {
        directory: clients,
        now: () => now,
      }),
    ).resolves.toMatchObject({
      subscription: {
        status: 'expired',
        subscription: expired,
        nextSubscription: null,
        founderRenewalDeadline: null,
        freeze: null,
        canRequestFreeze: false,
      },
      creditAvailableCentavos: 0,
    });
  });

  // Walkthrough n.º 60: AW22 shows the Plan a Guest Pass friend bought.
  it('reads the Plan that starts after the current one', async () => {
    const next = {
      ...subscription,
      id: 'subscription-2',
      planName: '12 clases',
      startsOn: new Date('2026-10-01T00:00:00.000Z'),
      endsOn: new Date('2026-10-30T00:00:00.000Z'),
    };
    const clients = directory({
      findFutureSubscription: jest.fn().mockResolvedValue(next),
    });

    await expect(
      readAdministratorClient({ clientId: 'client-id' }, administrator, {
        directory: clients,
        now: () => now,
      }),
    ).resolves.toMatchObject({
      subscription: { subscription, nextSubscription: next },
    });
    expect(clients.findFutureSubscription).toHaveBeenCalledWith(
      'client-id',
      today,
    );
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

// FIX-065 (walkthrough finding 91): Clientas › «Exportar CSV» downloads what
// the chip and the search show, every page of it, and the export is audited.
describe('exportAdministratorClients', () => {
  const row = (name: string) => ({ id: name, name });
  const pageOf = (names: string[], pageNumber: number, total: number) => ({
    ...emptyPage,
    items: names.map(row),
    page: pageNumber,
    pageSize: 100,
    totalItems: total,
  });

  it('reads every page of the chip and search and audits the count', async () => {
    const first = Array.from({ length: 100 }, (_, i) => `Clienta ${i}`);
    const list = jest
      .fn()
      .mockResolvedValueOnce(pageOf(first, 1, 101))
      .mockResolvedValueOnce(pageOf(['Valeria Quiroga'], 2, 101));
    const clients = directory({ list });

    const rows = await exportAdministratorClients(
      { query: '  vale ', filter: 'active' },
      administrator,
      { directory: clients, now: () => now },
    );

    expect(rows).toHaveLength(101);
    expect(list).toHaveBeenNthCalledWith(2, {
      page: 2,
      pageSize: 100,
      query: 'vale',
      filter: 'active',
      today,
      now,
    });
    expect(clients.recordExport).toHaveBeenCalledWith({
      actor: {
        accountId: 'staff-account',
        staffMemberId: 'staff-id',
        audit: {
          accountId: 'staff-account',
          role: 'ADMINISTRATOR',
          impersonationId: null,
        },
      },
      clientCount: 101,
      filter: 'active',
      occurredAt: now,
    });
  });

  it('refuses an Assistant without reading or auditing', async () => {
    const clients = directory();
    await expect(
      exportAdministratorClients({}, staff('assistant'), {
        directory: clients,
        now: () => now,
      }),
    ).rejects.toEqual(new AdministrationError('administration_access_denied'));
    expect(clients.list).not.toHaveBeenCalled();
    expect(clients.recordExport).not.toHaveBeenCalled();
  });
});
