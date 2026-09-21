import { BookingAccessDeniedError } from '../commands/create-booking';
import { loadClientProfile } from './client-profile';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};

describe('loadClientProfile', () => {
  it('returns the authenticated Client profile', async () => {
    const profile = {
      id: 'client-id',
      name: 'Lucía Fernández',
      email: 'lucia@example.com',
      phone: '+591 70011001',
      referralCode: 'REF-LUCIA',
    };
    const findProfile = jest.fn().mockResolvedValue(profile);

    await expect(
      loadClientProfile({ principal, findProfile }),
    ).resolves.toEqual(profile);
    expect(findProfile).toHaveBeenCalledWith('client-id');
  });

  it('fails when the linked Client no longer exists', async () => {
    await expect(
      loadClientProfile({
        principal,
        findProfile: jest.fn().mockResolvedValue(null),
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });

  it('denies Staff principals', async () => {
    await expect(
      loadClientProfile({
        principal: {
          ...principal,
          identity: {
            kind: 'staff',
            staffMemberId: 'staff-id',
            role: 'trainer',
            branchIds: [],
          },
        },
        findProfile: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});
