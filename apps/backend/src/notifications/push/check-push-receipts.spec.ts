import {
  checkPushReceipts,
  type CheckPushReceiptsDependencies,
} from './check-push-receipts';
import { PermanentPushError, TransientPushError } from './push-provider';

const at = new Date('2026-09-21T12:00:00.000Z');
const submitted = (n: number) => ({
  deliveryId: `delivery-${n}`,
  deviceId: `device-${n}`,
  ticketId: `ticket-${n}`,
});

const dependencies = (
  overrides: Partial<CheckPushReceiptsDependencies> = {},
): CheckPushReceiptsDependencies => ({
  discardUnconfirmed: jest.fn().mockResolvedValue(0),
  findSubmitted: jest.fn().mockResolvedValue([submitted(1), submitted(2)]),
  getReceipts: jest.fn().mockResolvedValue(
    new Map([
      ['ticket-1', { status: 'ok' }],
      [
        'ticket-2',
        {
          status: 'error',
          category: 'device_not_registered',
          deviceNotRegistered: true,
        },
      ],
    ]),
  ),
  recordReceipts: jest.fn().mockResolvedValue(undefined),
  now: () => at,
  ...overrides,
});

describe('checkPushReceipts', () => {
  it('discards deliveries unconfirmed after a day before checking the rest', async () => {
    const deps = dependencies({
      discardUnconfirmed: jest.fn().mockResolvedValue(3),
    });

    await expect(checkPushReceipts(deps)).resolves.toMatchObject({
      discarded: 3,
    });
    expect(deps.discardUnconfirmed).toHaveBeenCalledWith(
      new Date('2026-09-20T12:00:00.000Z'),
      at,
    );
  });

  it('checks up to one thousand deliveries submitted fifteen minutes ago', async () => {
    const deps = dependencies();

    await expect(checkPushReceipts(deps)).resolves.toEqual({
      discarded: 0,
      checked: 2,
      delivered: 1,
      failed: 1,
    });
    expect(deps.findSubmitted).toHaveBeenCalledWith({
      submittedBefore: new Date('2026-09-21T11:45:00.000Z'),
      limit: 1000,
    });
    expect(deps.getReceipts).toHaveBeenCalledWith(['ticket-1', 'ticket-2']);
    expect(deps.recordReceipts).toHaveBeenCalledWith(
      [
        { ...submitted(1), outcome: { status: 'ok' } },
        {
          ...submitted(2),
          outcome: {
            status: 'error',
            category: 'device_not_registered',
            deviceNotRegistered: true,
          },
        },
      ],
      at,
    );
  });

  it('records a receipt Expo does not have yet as checked, not settled', async () => {
    const deps = dependencies({
      getReceipts: jest.fn().mockResolvedValue(new Map()),
    });

    await expect(checkPushReceipts(deps)).resolves.toMatchObject({
      checked: 2,
      delivered: 0,
      failed: 0,
    });
    expect(deps.recordReceipts).toHaveBeenCalledWith(
      [
        { ...submitted(1), outcome: null },
        { ...submitted(2), outcome: null },
      ],
      at,
    );
  });

  it('skips the provider when nothing is waiting', async () => {
    const deps = dependencies({
      findSubmitted: jest.fn().mockResolvedValue([]),
    });

    await expect(checkPushReceipts(deps)).resolves.toMatchObject({
      checked: 0,
    });
    expect(deps.getReceipts).not.toHaveBeenCalled();
  });

  it('leaves deliveries for the next sweep when Expo is unavailable', async () => {
    const deps = dependencies({
      getReceipts: jest
        .fn()
        .mockRejectedValue(new TransientPushError('provider_unavailable')),
    });

    await expect(checkPushReceipts(deps)).resolves.toMatchObject({
      checked: 0,
    });
    expect(deps.recordReceipts).not.toHaveBeenCalled();
  });

  it('lets a permanent failure reach the sweep’s error report', async () => {
    const failure = new PermanentPushError('provider_authentication');
    const deps = dependencies({
      getReceipts: jest.fn().mockRejectedValue(failure),
    });

    await expect(checkPushReceipts(deps)).rejects.toBe(failure);
  });
});
