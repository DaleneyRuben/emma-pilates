import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { readClientOverview } from './assistant-clients';

const staff = (
  role: 'assistant' | 'administrator' | 'coordinator',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'staff', staffMemberId: `${role}-id`, role, branchIds: [] },
});

const contactedAt = new Date('2026-11-12T15:00:00.000Z');

// Staff pick E4 A: the Coordinator's ficha shows her last contact and whether
// she is on Para contactar (BKM-013); the contact list belongs to the
// Coordinator and the Administrator (ADR-0102), so the Assistant never reads it.
describe('Assistant Client overview contact', () => {
  const readContact = jest.fn().mockResolvedValue({
    onContactList: true,
    lastContactedAt: contactedAt,
    lastContactedByAccountId: 'coordinator-account',
  });
  const dependencies = (principal: AuthenticatedPrincipal) => ({
    principal,
    today: new Date('2026-11-19T00:00:00.000Z'),
    now: () => new Date('2026-11-19T12:00:00.000Z'),
    findClient: jest.fn().mockResolvedValue({
      id: 'client-id',
      name: 'Carla Prueba',
      email: 'carla@example.com',
      phone: '+591 70012345',
      accountStatus: 'active' as const,
      photo: null,
    }),
    findActiveSubscription: jest.fn().mockResolvedValue(null),
    findLatestSubscription: jest.fn().mockResolvedValue(null),
    findFutureSubscription: jest.fn().mockResolvedValue(null),
    findUpcoming: jest.fn().mockResolvedValue([]),
    findAttendedBookings: jest.fn().mockResolvedValue([]),
    readContact,
  });

  beforeEach(() => readContact.mockClear());

  it('gives the Coordinator her last contact, and says when it was hers', async () => {
    const overview = await readClientOverview(
      { clientId: 'client-id' },
      dependencies(staff('coordinator')),
    );

    expect(overview.contact).toEqual({
      onContactList: true,
      lastContactedAt: contactedAt,
      lastContactedByYou: true,
    });
    expect(readContact).toHaveBeenCalledWith('client-id');
  });

  it('gives the Administrator the same, not hers when someone else marked it', async () => {
    const overview = await readClientOverview(
      { clientId: 'client-id' },
      dependencies(staff('administrator')),
    );

    expect(overview.contact).toEqual({
      onContactList: true,
      lastContactedAt: contactedAt,
      lastContactedByYou: false,
    });
  });

  it('never reads the contact list for the Assistant', async () => {
    const overview = await readClientOverview(
      { clientId: 'client-id' },
      dependencies(staff('assistant')),
    );

    expect(overview).not.toHaveProperty('contact');
    expect(readContact).not.toHaveBeenCalled();
  });
});
