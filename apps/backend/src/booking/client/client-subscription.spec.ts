import { BookingAccessDeniedError } from '../commands/create-booking';
import { loadClientSubscription } from './client-subscription';

const today = new Date('2026-09-21T00:00:00.000Z');
const day = 24 * 60 * 60 * 1_000;
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const subscription = (endsInDays: number) => ({
  id: 'subscription-id',
  planName: 'Paquete de 8 clases',
  originalClassAllowance: 8,
  remainingClassAllowance: 5,
  startsOn: new Date(today.getTime() - 10 * day),
  endsOn: new Date(today.getTime() + endsInDays * day),
});

describe('loadClientSubscription', () => {
  it('reports an active Subscription outside the renewal reminder window', async () => {
    const active = subscription(4);

    await expect(
      loadClientSubscription({
        principal,
        today,
        findActiveSubscription: jest.fn().mockResolvedValue(active),
        findLatestSubscription: jest.fn(),
      }),
    ).resolves.toEqual({ status: 'active', subscription: active });
  });

  it('reports expiring soon from three days before the paid-through date', async () => {
    const expiring = subscription(3);
    const findActiveSubscription = jest.fn().mockResolvedValue(expiring);

    await expect(
      loadClientSubscription({
        principal,
        today,
        findActiveSubscription,
        findLatestSubscription: jest.fn(),
      }),
    ).resolves.toEqual({ status: 'expiring_soon', subscription: expiring });
    expect(findActiveSubscription).toHaveBeenCalledWith('client-id', today);
  });

  it('reports the latest Subscription as expired when none is active', async () => {
    const expired = subscription(-10);
    const findLatestSubscription = jest.fn().mockResolvedValue(expired);

    await expect(
      loadClientSubscription({
        principal,
        today,
        findActiveSubscription: jest.fn().mockResolvedValue(null),
        findLatestSubscription,
      }),
    ).resolves.toEqual({ status: 'expired', subscription: expired });
    expect(findLatestSubscription).toHaveBeenCalledWith('client-id');
  });

  it('reports none when the Client never had a Subscription', async () => {
    await expect(
      loadClientSubscription({
        principal,
        today,
        findActiveSubscription: jest.fn().mockResolvedValue(null),
        findLatestSubscription: jest.fn().mockResolvedValue(null),
      }),
    ).resolves.toEqual({ status: 'none', subscription: null });
  });

  it('denies Staff principals', async () => {
    await expect(
      loadClientSubscription({
        principal: {
          ...principal,
          identity: {
            kind: 'staff',
            staffMemberId: 'staff-id',
            role: 'assistant',
            branchIds: [],
          },
        },
        today,
        findActiveSubscription: jest.fn(),
        findLatestSubscription: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});
