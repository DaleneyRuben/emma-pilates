import { dispatchPush, type DispatchPushDependencies } from './dispatch-push';
import {
  PermanentPushError,
  TransientPushError,
  type PushMessage,
  type PushTicket,
} from './push-provider';

const at = new Date('2026-09-21T12:00:00.000Z');
const job = {
  version: 1 as const,
  accountId: 'account-1',
  businessEventKey: 'waitlist-promoted:entry-1',
};
const notification = {
  id: 'notification-1',
  type: 'waitlist_promoted',
  title: 'Cupo liberado',
  message: '¡Tienes un cupo para Reformer!',
  destinationType: 'booking',
  destinationId: 'booking-1',
};
const delivery = (n: number) => ({
  deliveryId: `delivery-${n}`,
  deviceId: `device-${n}`,
  expoPushToken: `ExponentPushToken[${n}]`,
});

const dependencies = (
  overrides: Partial<DispatchPushDependencies> = {},
): DispatchPushDependencies => ({
  findNotification: jest.fn().mockResolvedValue(notification),
  prepareDeliveries: jest.fn().mockResolvedValue([delivery(1)]),
  countUnread: jest.fn().mockResolvedValue(3),
  send: jest.fn().mockImplementation((messages: PushMessage[]) =>
    Promise.resolve(
      messages.map((_, i): PushTicket => ({
        status: 'ok',
        id: `ticket-${i}`,
      })),
    ),
  ),
  recordTickets: jest.fn().mockResolvedValue(undefined),
  recordAttempt: jest.fn().mockResolvedValue(undefined),
  now: () => at,
  ...overrides,
});

describe('dispatchPush', () => {
  it('does nothing when the inbox entry is gone', async () => {
    const deps = dependencies({
      findNotification: jest.fn().mockResolvedValue(null),
    });

    await expect(dispatchPush(job, deps)).resolves.toEqual({
      outcome: 'stale',
    });
    expect(deps.prepareDeliveries).not.toHaveBeenCalled();
  });

  it('does nothing when the Account has no device to reach', async () => {
    const deps = dependencies({
      prepareDeliveries: jest.fn().mockResolvedValue([]),
    });

    await expect(dispatchPush(job, deps)).resolves.toEqual({
      outcome: 'no_devices',
    });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('sends an audible message with the entry text, the unread badge, and only identifiers as data', async () => {
    const deps = dependencies();

    await expect(dispatchPush(job, deps)).resolves.toEqual({
      outcome: 'sent',
      submitted: 1,
      failed: 0,
    });
    expect(deps.prepareDeliveries).toHaveBeenCalledWith({
      notificationId: 'notification-1',
      accountId: 'account-1',
    });
    expect(deps.send).toHaveBeenCalledWith([
      {
        to: 'ExponentPushToken[1]',
        title: 'Cupo liberado',
        body: '¡Tienes un cupo para Reformer!',
        sound: 'default',
        badge: 3,
        channelId: 'actionable',
        priority: 'high',
        data: {
          notificationId: 'notification-1',
          type: 'waitlist_promoted',
          destinationType: 'booking',
          destinationId: 'booking-1',
        },
      },
    ]);
    expect(deps.recordTickets).toHaveBeenCalledWith(
      [
        {
          deliveryId: 'delivery-1',
          deviceId: 'device-1',
          ticket: { status: 'ok', id: 'ticket-0' },
        },
      ],
      at,
    );
  });

  it('sends a silent private type with generic copy on the updates channel', async () => {
    const deps = dependencies({
      findNotification: jest.fn().mockResolvedValue({
        ...notification,
        type: 'evaluation_booked',
        message: 'Nueva evaluación agendada con Lucía.',
      }),
    });

    await dispatchPush(job, deps);

    const [[messages]] = (deps.send as jest.Mock).mock.calls as [
      [PushMessage[]],
    ];
    expect(messages[0]).toMatchObject({
      title: 'Nueva cita',
      body: 'Tienes una nueva cita en tu agenda.',
      sound: null,
      channelId: 'updates',
      priority: 'normal',
    });
  });

  it('sends at most one hundred messages per request', async () => {
    const deps = dependencies({
      prepareDeliveries: jest
        .fn()
        .mockResolvedValue(Array.from({ length: 150 }, (_, i) => delivery(i))),
    });

    await dispatchPush(job, deps);

    const calls = (deps.send as jest.Mock).mock.calls as [PushMessage[]][];
    expect(calls.map(([messages]) => messages.length)).toEqual([100, 50]);
  });

  it('counts failed tickets', async () => {
    const deps = dependencies({
      send: jest.fn().mockResolvedValue([
        {
          status: 'error',
          category: 'device_not_registered',
          deviceNotRegistered: true,
        },
      ]),
    });

    await expect(dispatchPush(job, deps)).resolves.toEqual({
      outcome: 'sent',
      submitted: 0,
      failed: 1,
    });
  });

  it('records the attempt and rethrows a transient failure for a retry', async () => {
    const failure = new TransientPushError('provider_unavailable');
    const deps = dependencies({ send: jest.fn().mockRejectedValue(failure) });

    await expect(dispatchPush(job, deps)).rejects.toBe(failure);
    expect(deps.recordAttempt).toHaveBeenCalledWith(
      ['delivery-1'],
      { category: 'provider_unavailable', final: false },
      at,
    );
  });

  it('fails the deliveries for good on a permanent failure', async () => {
    const failure = new PermanentPushError('provider_authentication');
    const deps = dependencies({ send: jest.fn().mockRejectedValue(failure) });

    await expect(dispatchPush(job, deps)).rejects.toBe(failure);
    expect(deps.recordAttempt).toHaveBeenCalledWith(
      ['delivery-1'],
      { category: 'provider_authentication', final: true },
      at,
    );
  });

  it('retries the job when Expo asks to slow down for a message', async () => {
    const deps = dependencies({
      send: jest.fn().mockResolvedValue([
        {
          status: 'error',
          category: 'rate_exceeded',
          deviceNotRegistered: false,
        },
      ]),
    });

    await expect(dispatchPush(job, deps)).rejects.toBeInstanceOf(
      TransientPushError,
    );
    expect(deps.recordTickets).toHaveBeenCalledWith([], at);
    expect(deps.recordAttempt).toHaveBeenCalledWith(
      ['delivery-1'],
      { category: 'rate_exceeded', final: false },
      at,
    );
  });
});
