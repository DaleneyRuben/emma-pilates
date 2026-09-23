import { BookingAccessDeniedError } from '../commands/create-booking';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { listAdministratorSessions } from './administrator-sessions';

const staff = (
  role: 'administrator' | 'assistant',
): AuthenticatedPrincipal => ({
  accountId: 'account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: 'staff',
    role,
    branchIds: ['centro'],
  },
});

const query = {
  from: new Date('2026-09-23T00:00:00.000Z'),
  until: new Date('2026-09-24T00:00:00.000Z'),
  limit: 100,
};

describe('listAdministratorSessions', () => {
  it('reads scheduled Sessions across every Branch for an Administrator', async () => {
    const read = jest
      .fn()
      .mockResolvedValue([{ id: 'session-1', branchName: 'Urubó' }]);

    await expect(
      listAdministratorSessions(query, staff('administrator'), read),
    ).resolves.toEqual([{ id: 'session-1', branchName: 'Urubó' }]);
    expect(read).toHaveBeenCalledWith(query);
  });

  it('denies every other Role, including Assistants at a Branch', async () => {
    const read = jest.fn();

    await expect(
      listAdministratorSessions(query, staff('assistant'), read),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    expect(read).not.toHaveBeenCalled();
  });
});
