import type { NewNotification } from '../../notifications/prisma-notification-store';
import { addCivilDays } from '../../time/bolivia-time';
import { civilListDate } from '../payroll/pay-line-detail';

export type PayoutQrStanding = 'valid' | 'expiring' | 'expired';

// The valid-until date is the last day the QR pays (follow-up 276).
const reminderLeadDays = 7;
const latestValidUntilYears = 5;
const civilDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export const payoutQrStanding = (
  validUntil: Date,
  today: Date,
): PayoutQrStanding => {
  if (today.getTime() > validUntil.getTime()) return 'expired';
  if (addCivilDays(today, reminderLeadDays).getTime() >= validUntil.getTime())
    return 'expiring';
  return 'valid';
};

export const validateValidUntil = (value: string, today: Date): Date | null => {
  const match = civilDatePattern.exec(value);
  if (match === null) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  const latest = new Date(today);
  latest.setUTCFullYear(latest.getUTCFullYear() + latestValidUntilYears);
  return date.getTime() > today.getTime() && date.getTime() <= latest.getTime()
    ? date
    : null;
};

export type PayoutQrReminderCandidate = {
  id: string;
  accountId: string;
  validUntil: Date;
};

export type PayoutQrReminder = Omit<NewNotification, 'occurredAt'>;

export const payoutQrReminderFor = (
  qr: PayoutQrReminderCandidate,
  today: Date,
): PayoutQrReminder | null => {
  const standing = payoutQrStanding(qr.validUntil, today);
  if (standing === 'valid') return null;
  const day = civilListDate(qr.validUntil);
  const destination = { type: 'payout_qr', id: qr.id };
  return standing === 'expiring'
    ? {
        accountId: qr.accountId,
        category: 'reminder',
        type: 'payout_qr_expiring',
        businessEventKey: `payout-qr-expiring:${qr.id}`,
        title: 'Tu QR de cobro vence pronto',
        message: `Tu QR de cobro vence el ${day}, sube uno nuevo.`,
        destination,
      }
    : {
        accountId: qr.accountId,
        category: 'reminder',
        type: 'payout_qr_expired',
        businessEventKey: `payout-qr-expired:${qr.id}`,
        title: 'Tu QR de cobro venció',
        message: `Tu QR de cobro venció el ${day}, sube uno nuevo para que podamos pagarte.`,
        destination,
      };
};
