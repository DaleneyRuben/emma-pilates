import { BookingAccessDeniedError } from '../commands/create-booking';
import { loadStaffProfile } from './staff-profile';

const staffPrincipal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'staff-id',
    role: 'trainer' as const,
    branchIds: ['branch-1'],
  },
};

describe('loadStaffProfile', () => {
  it('returns the authenticated Staff Member profile', async () => {
    const profile = {
      id: 'staff-id',
      name: 'Emma Vargas',
      email: 'emma.vargas@example.com',
      phone: null,
      role: 'trainer',
      branches: [{ id: 'branch-1', name: 'Centro' }],
    };
    const findProfile = jest.fn().mockResolvedValue(profile);

    await expect(
      loadStaffProfile({ principal: staffPrincipal, findProfile }),
    ).resolves.toEqual(profile);
    expect(findProfile).toHaveBeenCalledWith('staff-id');
  });

  it('denies Client principals and missing Staff Members', async () => {
    await expect(
      loadStaffProfile({
        principal: {
          ...staffPrincipal,
          identity: { kind: 'client', clientId: 'client-id' },
        },
        findProfile: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    await expect(
      loadStaffProfile({
        principal: staffPrincipal,
        findProfile: jest.fn().mockResolvedValue(null),
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});
