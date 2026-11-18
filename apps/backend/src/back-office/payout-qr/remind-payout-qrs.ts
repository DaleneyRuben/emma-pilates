import type { NewNotification } from '../../notifications/prisma-notification-store';
import {
  payoutQrReminderFor,
  type PayoutQrReminderCandidate,
} from './payout-qr-standing';

// FIX-072: the sweep finds every current QR of an active staff member and
// sends the one reminder each is due; a key it already holds is skipped, so a
// missed day is recovered on the next and nothing is sent twice.
export const remindPayoutQrs = async (dependencies: {
  today: Date;
  occurredAt: Date;
  findCurrentQrs: () => Promise<PayoutQrReminderCandidate[]>;
  findAlreadySent: (keys: string[]) => Promise<string[]>;
  record: (notification: NewNotification) => Promise<void>;
}): Promise<{ reminded: number }> => {
  const due = (await dependencies.findCurrentQrs()).flatMap((qr) => {
    const reminder = payoutQrReminderFor(qr, dependencies.today);
    return reminder === null ? [] : [reminder];
  });
  if (due.length === 0) return { reminded: 0 };

  const sent = new Set(
    await dependencies.findAlreadySent(due.map((r) => r.businessEventKey)),
  );
  const pending = due.filter((r) => !sent.has(r.businessEventKey));
  for (const reminder of pending) {
    await dependencies.record({
      ...reminder,
      occurredAt: dependencies.occurredAt,
    });
  }
  return { reminded: pending.length };
};
