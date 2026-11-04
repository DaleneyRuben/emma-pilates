import { AdministrationError } from '../administration/administration-errors';
import {
  loadAdministratorSessionRoster,
  type AdministratorSessionRoster,
} from './administrator-session-roster';

const staff = (role: 'administrator' | 'coordinator' | 'assistant') => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session',
  identity: {
    kind: 'staff' as const,
    staffMemberId: role,
    role,
    branchIds: ['branch-id'],
  },
});

const roster: AdministratorSessionRoster = {
  sessionId: 'session-id',
  bookings: [
    {
      bookingId: 'booking-id',
      clientId: 'client-ana',
      clientName: 'Ana Pérez',
      attendanceOutcome: null,
    },
  ],
  waitlist: [
    {
      waitlistEntryId: 'entry-id',
      clientId: 'client-bea',
      clientName: 'Bea Rojas',
      position: 1,
    },
  ],
};

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    return error instanceof AdministrationError ? error.code : String(error);
  }
};

// WEB-039: who booked a Session and who waits for it, for the people who run
// the schedule (ADR-0108).
describe('loadAdministratorSessionRoster', () => {
  it.each(['administrator', 'coordinator'] as const)(
    'gives the %s the booked Clients and the Waitlist in order',
    async (role) => {
      const findRoster = jest.fn().mockResolvedValue(roster);

      await expect(
        loadAdministratorSessionRoster('session-id', staff(role), findRoster),
      ).resolves.toEqual(roster);
      expect(findRoster).toHaveBeenCalledWith('session-id');
    },
  );

  it('denies anyone who does not run the schedule before reading', async () => {
    const findRoster = jest.fn().mockResolvedValue(roster);

    await expect(
      codeOf(
        loadAdministratorSessionRoster(
          'session-id',
          staff('assistant'),
          findRoster,
        ),
      ),
    ).resolves.toBe('administration_access_denied');
    await expect(
      codeOf(
        loadAdministratorSessionRoster(
          'session-id',
          {
            accountId: 'client-account',
            authenticationSessionId: 'authentication-session',
            identity: { kind: 'client', clientId: 'client-ana' },
          },
          findRoster,
        ),
      ),
    ).resolves.toBe('administration_access_denied');
    expect(findRoster).not.toHaveBeenCalled();
  });

  it('answers session_not_found for a Session that does not exist', async () => {
    await expect(
      codeOf(
        loadAdministratorSessionRoster(
          'session-id',
          staff('administrator'),
          jest.fn().mockResolvedValue(null),
        ),
      ),
    ).resolves.toBe('session_not_found');
  });
});
