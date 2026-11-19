import {
  payoutQrReminderFor,
  payoutQrStanding,
  validateValidUntil,
} from './payout-qr-standing';

const civil = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('payoutQrStanding', () => {
  it('is valid while more than seven days remain', () => {
    expect(payoutQrStanding(civil('2026-12-15'), civil('2026-12-07'))).toBe(
      'valid',
    );
  });

  it('is expiring from seven days before its last day through that day', () => {
    expect(payoutQrStanding(civil('2026-12-15'), civil('2026-12-08'))).toBe(
      'expiring',
    );
    expect(payoutQrStanding(civil('2026-12-15'), civil('2026-12-15'))).toBe(
      'expiring',
    );
  });

  it('is expired from the day after its last day', () => {
    expect(payoutQrStanding(civil('2026-12-15'), civil('2026-12-16'))).toBe(
      'expired',
    );
  });
});

describe('validateValidUntil', () => {
  it('accepts a day after today', () => {
    expect(validateValidUntil('2026-12-15', civil('2026-11-18'))).toEqual(
      civil('2026-12-15'),
    );
  });

  it('refuses today, a past day, and anything that is not a civil date', () => {
    expect(validateValidUntil('2026-11-18', civil('2026-11-18'))).toBeNull();
    expect(validateValidUntil('2026-11-01', civil('2026-11-18'))).toBeNull();
    expect(validateValidUntil('2026-02-30', civil('2026-11-18'))).toBeNull();
    expect(validateValidUntil('15/12/2026', civil('2026-11-18'))).toBeNull();
  });

  it('refuses a date more than five years ahead', () => {
    expect(validateValidUntil('2032-01-01', civil('2026-11-18'))).toBeNull();
  });
});

describe('payoutQrReminderFor', () => {
  const qr = {
    id: 'qr-1',
    accountId: 'account-1',
    validUntil: civil('2026-12-15'),
  };

  it('sends nothing while more than seven days remain', () => {
    expect(payoutQrReminderFor(qr, civil('2026-12-07'))).toBeNull();
  });

  it('reminds once from seven days before the last day', () => {
    expect(payoutQrReminderFor(qr, civil('2026-12-08'))).toEqual({
      accountId: 'account-1',
      category: 'reminder',
      type: 'payout_qr_expiring',
      businessEventKey: 'payout-qr-expiring:qr-1',
      title: 'Tu QR de cobro vence pronto',
      message: 'Tu QR de cobro vence el mar 15 dic, sube uno nuevo.',
      destination: { type: 'payout_qr', id: 'qr-1' },
    });
  });

  it('says it expired from the first day it no longer works', () => {
    expect(payoutQrReminderFor(qr, civil('2026-12-16'))).toEqual({
      accountId: 'account-1',
      category: 'reminder',
      type: 'payout_qr_expired',
      businessEventKey: 'payout-qr-expired:qr-1',
      title: 'Tu QR de cobro venció',
      message:
        'Tu QR de cobro venció el mar 15 dic, sube uno nuevo para que podamos pagarte.',
      destination: { type: 'payout_qr', id: 'qr-1' },
    });
  });
});
