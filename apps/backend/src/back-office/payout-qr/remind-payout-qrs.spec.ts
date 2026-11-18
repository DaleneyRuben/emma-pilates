import type { NewNotification } from '../../notifications/prisma-notification-store';
import { remindPayoutQrs } from './remind-payout-qrs';

const civil = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const today = civil('2026-12-08');
const occurredAt = new Date('2026-12-08T13:00:00.000Z');

describe('remindPayoutQrs', () => {
  it('reminds each current QR that is due a reminder it has not had', async () => {
    const record = jest
      .fn<Promise<void>, [NewNotification]>()
      .mockResolvedValue(undefined);
    const findAlreadySent = jest
      .fn()
      .mockResolvedValue(['payout-qr-expired:qr-old']);

    await expect(
      remindPayoutQrs({
        today,
        occurredAt,
        findCurrentQrs: jest.fn().mockResolvedValue([
          {
            id: 'qr-soon',
            accountId: 'account-1',
            validUntil: civil('2026-12-15'),
          },
          {
            id: 'qr-later',
            accountId: 'account-2',
            validUntil: civil('2027-01-15'),
          },
          {
            id: 'qr-old',
            accountId: 'account-3',
            validUntil: civil('2026-12-01'),
          },
          {
            id: 'qr-gone',
            accountId: 'account-4',
            validUntil: civil('2026-12-07'),
          },
        ]),
        findAlreadySent,
        record,
      }),
    ).resolves.toEqual({ reminded: 2 });

    expect(findAlreadySent).toHaveBeenCalledWith([
      'payout-qr-expiring:qr-soon',
      'payout-qr-expired:qr-old',
      'payout-qr-expired:qr-gone',
    ]);
    expect(record.mock.calls.map(([notification]) => notification)).toEqual([
      expect.objectContaining({
        businessEventKey: 'payout-qr-expiring:qr-soon',
        accountId: 'account-1',
        occurredAt,
      }),
      expect.objectContaining({
        businessEventKey: 'payout-qr-expired:qr-gone',
        message:
          'Tu QR de cobro venció el 7/12, sube uno nuevo para que podamos pagarte.',
        occurredAt,
      }),
    ]);
  });

  it('asks nothing more when no QR is due', async () => {
    const findAlreadySent = jest.fn();

    await expect(
      remindPayoutQrs({
        today,
        occurredAt,
        findCurrentQrs: jest.fn().mockResolvedValue([]),
        findAlreadySent,
        record: jest.fn(),
      }),
    ).resolves.toEqual({ reminded: 0 });
    expect(findAlreadySent).not.toHaveBeenCalled();
  });
});
