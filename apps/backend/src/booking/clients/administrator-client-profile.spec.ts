import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import {
  listAdministratorClients,
  readAdministratorClient,
  updateAdministratorClientProfile,
  type AdministratorClientDirectory,
} from './administrator-clients';

// IDN-009 / ADR-0102: the Coordinator reads the Client directory and detail
// without any amount, and both she and the Administrator correct a Client's
// name and phone.
const staff = (
  role: 'administrator' | 'coordinator' | 'assistant',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'staff', staffMemberId: `${role}-id`, role, branchIds: [] },
});
const now = new Date('2026-10-23T14:00:00.000Z');
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
const outlook = {
  futureBookingCount: 0,
  activeWaitlistEntryCount: 0,
  upcomingEvaluationCount: 0,
  transferPaymentPending: false,
};

const directory = (
  overrides: Partial<AdministratorClientDirectory> = {},
): AdministratorClientDirectory => ({
  list: jest.fn().mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    studioClientCount: 0,
    activePlanClientCount: 0,
  }),
  read: jest.fn().mockResolvedValue(lucia),
  findActiveSubscription: jest.fn().mockResolvedValue(null),
  findLatestSubscription: jest.fn().mockResolvedValue(null),
  readAvailableCredit: jest.fn().mockResolvedValue(105_000),
  readClosureOutlook: jest.fn().mockResolvedValue(outlook),
  saveProfile: jest
    .fn()
    .mockImplementation((input: { name: string; phone: string | null }) =>
      Promise.resolve({ ...lucia, name: input.name, phone: input.phone }),
    ),
  ...overrides,
});

describe('the Coordinator in the Client directory (ADR-0102)', () => {
  it('pages the directory and reads the detail without the Credit amount', async () => {
    const clients = directory();
    const coordinator = staff('coordinator');

    await expect(
      listAdministratorClients({ page: 1, pageSize: 20 }, coordinator, {
        directory: clients,
        now: () => now,
      }),
    ).resolves.toMatchObject({ totalItems: 0 });

    const detail = await readAdministratorClient(
      { clientId: 'client-id' },
      coordinator,
      { directory: clients, now: () => now },
    );
    expect(detail).toMatchObject({ id: 'client-id', closure: outlook });
    expect(detail).not.toHaveProperty('creditAvailableCentavos');
    expect(clients.readAvailableCredit).not.toHaveBeenCalled();
  });
});

describe('updateAdministratorClientProfile', () => {
  it.each(['administrator', 'coordinator'] as const)(
    'lets the %s correct the name and phone, trimmed, and audits it',
    async (role) => {
      const clients = directory();

      await expect(
        updateAdministratorClientProfile(
          { clientId: 'client-id', name: '  Lucía Fernández Paz ', phone: ' ' },
          staff(role),
          { directory: clients, now: () => now },
        ),
      ).resolves.toMatchObject({ name: 'Lucía Fernández Paz', phone: null });
      expect(clients.saveProfile).toHaveBeenCalledWith({
        clientId: 'client-id',
        name: 'Lucía Fernández Paz',
        phone: null,
        actorAccountId: `${role}-account`,
        actorRole: role,
        occurredAt: now,
        previous: { name: 'Lucía Fernández', phone: '+591 70011001' },
      });
    },
  );

  it('refuses the Assistant, a blank name, and an unknown Client', async () => {
    const clients = directory();
    await expect(
      updateAdministratorClientProfile(
        { clientId: 'client-id', name: 'Lucía', phone: null },
        staff('assistant'),
        { directory: clients, now: () => now },
      ),
    ).rejects.toEqual(new AdministrationError('administration_access_denied'));
    await expect(
      updateAdministratorClientProfile(
        { clientId: 'client-id', name: '   ', phone: null },
        staff('administrator'),
        { directory: clients, now: () => now },
      ),
    ).rejects.toEqual(new AdministrationError('client_name_required'));
    await expect(
      updateAdministratorClientProfile(
        { clientId: 'missing', name: 'Lucía', phone: null },
        staff('administrator'),
        {
          directory: directory({ read: jest.fn().mockResolvedValue(null) }),
          now: () => now,
        },
      ),
    ).rejects.toEqual(new AdministrationError('client_not_found'));
    expect(clients.saveProfile).not.toHaveBeenCalled();
  });
});
