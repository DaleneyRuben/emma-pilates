import { toGuestPass } from '../catalog/subscription-guest-pass';
import { guestPassField, loadClientSubscription } from './client-subscription';

const today = new Date('2026-09-21T00:00:00.000Z');
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};

// Walkthrough n.º 19 and 22 (C02f, C02j): the guest's Inicio says who
// invited her, and says so too when that code gave her no free class.
describe('the guest home', () => {
  it('names the host of a Guest Pass by first name and initials', () => {
    const pass = toGuestPass([
      { booking: null, host: { name: 'Lucía Fernández Rojas' } },
    ]);

    expect(guestPassField(pass)).toEqual({
      guestPass: {
        usedClassStartsAt: null,
        hostFirstName: 'Lucía',
        hostInitials: 'LF',
      },
    });
  });

  it('tells a Client with no Plan that her friend’s code was not active', async () => {
    const readInactiveInvite = jest
      .fn()
      .mockResolvedValue({ hostFirstName: 'Lucía' });

    await expect(
      loadClientSubscription({
        principal,
        today,
        findActiveSubscription: jest.fn().mockResolvedValue(null),
        findLatestSubscription: jest.fn().mockResolvedValue(null),
        findFutureSubscription: jest.fn(),
        readInactiveInvite,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'none',
        inactiveInvite: { hostFirstName: 'Lucía' },
      }),
    );
    expect(readInactiveInvite).toHaveBeenCalledWith('client-id');
  });

  it('says nothing about the invite once she has a Plan', async () => {
    const readInactiveInvite = jest.fn();
    const view = await loadClientSubscription({
      principal,
      today,
      findActiveSubscription: jest.fn().mockResolvedValue({
        id: 's',
        planName: 'Paquete de 8 clases',
        originalClassAllowance: 8,
        remainingClassAllowance: 8,
        startsOn: today,
        endsOn: new Date('2026-10-20T00:00:00.000Z'),
        extraClassesLine: null,
      }),
      findLatestSubscription: jest.fn(),
      findFutureSubscription: jest.fn().mockResolvedValue(null),
      readInactiveInvite,
    });

    expect(view).not.toHaveProperty('inactiveInvite');
    expect(readInactiveInvite).not.toHaveBeenCalled();
  });
});
