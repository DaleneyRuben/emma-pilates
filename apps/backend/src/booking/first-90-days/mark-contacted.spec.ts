import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import { markClientContacted } from './mark-contacted';

const staff = (
  role:
    'assistant' | 'administrator' | 'trainer' | 'nutritionist' | 'coordinator',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-id`,
    role,
    branchIds: role === 'administrator' || role === 'coordinator' ? [] : ['b1'],
  },
});

const now = new Date('2026-10-08T16:00:00.000Z');

describe('markClientContacted', () => {
  it('marks every open reason for the Administrator and the Coordinator', async () => {
    const mark = jest.fn().mockResolvedValue(['no_booking_7_days']);

    await markClientContacted(
      { clientId: 'client-1' },
      staff('administrator'),
      { now: () => now, store: { mark } },
    );
    expect(mark).toHaveBeenCalledWith({
      clientId: 'client-1',
      accountId: 'administrator-account',
      actorRole: 'administrator',
      occurredAt: now,
    });

    await markClientContacted({ clientId: 'client-1' }, staff('coordinator'), {
      now: () => now,
      store: { mark },
    });
    expect(mark).toHaveBeenLastCalledWith({
      clientId: 'client-1',
      accountId: 'coordinator-account',
      actorRole: 'coordinator',
      occurredAt: now,
    });
  });

  it('refuses a Client with nothing open', async () => {
    await expect(
      markClientContacted({ clientId: 'client-1' }, staff('administrator'), {
        now: () => now,
        store: { mark: jest.fn().mockResolvedValue([]) },
      }),
    ).rejects.toEqual(new AdministrationError('contact_alert_not_found'));
  });

  it.each([
    ['an Assistant', staff('assistant')],
    ['a Trainer', staff('trainer')],
    ['the Nutritionist', staff('nutritionist')],
  ])('denies %s', async (_who, principal) => {
    const mark = jest.fn();
    await expect(
      markClientContacted({ clientId: 'client-1' }, principal, {
        now: () => now,
        store: { mark },
      }),
    ).rejects.toEqual(new AdministrationError('administration_access_denied'));
    expect(mark).not.toHaveBeenCalled();
  });
});
