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
        findFutureSubscription: jest.fn().mockResolvedValue(null),
      }),
    ).resolves.toEqual({
      status: 'active',
      subscription: active,
      nextSubscription: null,
      founderRenewalDeadline: null,
      freeze: null,
      canRequestFreeze: false,
    });
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
        findFutureSubscription: jest.fn().mockResolvedValue(null),
      }),
    ).resolves.toEqual({
      status: 'expiring_soon',
      subscription: expiring,
      nextSubscription: null,
      founderRenewalDeadline: null,
      freeze: null,
      canRequestFreeze: false,
    });
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
        findFutureSubscription: jest.fn(),
      }),
    ).resolves.toEqual({
      status: 'expired',
      subscription: expired,
      nextSubscription: null,
      founderRenewalDeadline: null,
      freeze: null,
      canRequestFreeze: false,
    });
    expect(findLatestSubscription).toHaveBeenCalledWith('client-id');
  });

  it('reports none when the Client never had a Subscription', async () => {
    await expect(
      loadClientSubscription({
        principal,
        today,
        findActiveSubscription: jest.fn().mockResolvedValue(null),
        findLatestSubscription: jest.fn().mockResolvedValue(null),
        findFutureSubscription: jest.fn(),
      }),
    ).resolves.toEqual({
      status: 'none',
      subscription: null,
      nextSubscription: null,
      founderRenewalDeadline: null,
      freeze: null,
      canRequestFreeze: false,
    });
  });

  it('names the future Subscription when one is already queued', async () => {
    const active = subscription(10);
    const next = subscription(40);

    await expect(
      loadClientSubscription({
        principal,
        today,
        findActiveSubscription: jest.fn().mockResolvedValue(active),
        findLatestSubscription: jest.fn(),
        findFutureSubscription: jest.fn().mockResolvedValue(next),
      }),
    ).resolves.toEqual({
      status: 'active',
      subscription: active,
      nextSubscription: next,
      founderRenewalDeadline: null,
      freeze: null,
      canRequestFreeze: false,
    });
  });

  it('names the founder renewal deadline from the current Subscription real end', async () => {
    const active = subscription(4);

    await expect(
      loadClientSubscription({
        principal,
        today,
        findActiveSubscription: jest.fn().mockResolvedValue(active),
        findLatestSubscription: jest.fn(),
        findFutureSubscription: jest.fn().mockResolvedValue(null),
        readFounderRenewal: jest.fn().mockResolvedValue({ gapDays: 7 }),
      }),
    ).resolves.toEqual({
      status: 'active',
      subscription: active,
      nextSubscription: null,
      founderRenewalDeadline: '2026-10-03',
      freeze: null,
      canRequestFreeze: false,
    });
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
        findFutureSubscription: jest.fn(),
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});
