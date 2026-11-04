import { AdministrationError } from '../administration/administration-errors';
import { AdministratorSessionRosterController } from './administrator-session-roster.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const sessionId = '55555555-5555-4555-8555-555555555555';
const coordinator = {
  accountId: 'coordinator-account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'coordinator',
    role: 'coordinator' as const,
    branchIds: [],
  },
};

describe('AdministratorSessionRosterController', () => {
  const resolvePrincipal = jest.fn();
  const loadRoster = jest.fn();
  const controller = new AdministratorSessionRosterController(
    loadRoster,
    resolvePrincipal,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(coordinator);
  });

  it('reads the roster of one Session for the signed-in Staff Member', async () => {
    const roster = { sessionId, bookings: [], waitlist: [] };
    loadRoster.mockResolvedValue(roster);

    await expect(controller.read(sessionId, bearer)).resolves.toEqual(roster);
    expect(loadRoster).toHaveBeenCalledWith(sessionId, coordinator);
  });

  it('answers each refusal with its stable code', async () => {
    await expect(controller.read('nope', bearer)).rejects.toMatchObject({
      status: 400,
      response: { code: 'invalid_request' },
    });

    loadRoster.mockRejectedValue(new AdministrationError('session_not_found'));
    await expect(controller.read(sessionId, bearer)).rejects.toMatchObject({
      status: 404,
      response: { code: 'session_not_found' },
    });

    loadRoster.mockRejectedValue(
      new AdministrationError('administration_access_denied'),
    );
    await expect(controller.read(sessionId, bearer)).rejects.toMatchObject({
      status: 403,
      response: { code: 'administration_access_denied' },
    });
  });
});
