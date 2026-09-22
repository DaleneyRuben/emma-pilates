import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { StaffProfileController } from './staff-profile.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'staff' as const, staffMemberId: 'staff-member-id' },
};

describe('StaffProfileController', () => {
  const resolvePrincipal = jest.fn();
  const loadProfile = jest.fn();
  const controller = new StaffProfileController(loadProfile, resolvePrincipal);

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('returns the authenticated Staff Member profile', async () => {
    const profile = {
      id: 'staff-member-id',
      name: 'Emma Vargas',
      email: 'emma.vargas@example.com',
      phone: null,
      role: 'trainer',
      branches: [{ id: 'branch-id', name: 'Centro' }],
    };
    loadProfile.mockResolvedValue(profile);

    await expect(controller.profile(bearer)).resolves.toEqual(profile);
    expect(loadProfile).toHaveBeenCalledWith(principal);
  });

  it('requires a bearer credential', async () => {
    await expect(controller.profile(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('maps denied access to a 403 problem', async () => {
    loadProfile.mockRejectedValue(new BookingAccessDeniedError());

    await expect(controller.profile(bearer)).rejects.toMatchObject({
      response: { code: 'booking_access_denied' },
      status: 403,
    });
    await expect(controller.profile(bearer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
