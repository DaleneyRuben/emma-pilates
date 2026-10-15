import { presentNotification } from './notification-catalog';

const audible = [
  'waitlist_promoted',
  'session_cancelled',
  'session_rescheduled_by_studio',
  'session_assigned',
  'evaluation_reminder_day',
  'evaluation_reminder_hour',
  'evaluation_cancelled_by_studio',
  'payment_submitted',
  'payment_rejected',
];
const silent = [
  'evaluation_booked',
  'evaluation_cancelled',
  'payment_confirmed',
  'subscription_expiring',
];
// Their inbox text names an Evaluation, a Client, a rejection reason, or an
// amount, so the lock screen shows generic copy instead (ADR-0025).
const privateTypes = [
  'evaluation_reminder_day',
  'evaluation_reminder_hour',
  'evaluation_cancelled_by_studio',
  'evaluation_booked',
  'evaluation_cancelled',
  'payment_rejected',
];

describe('notification catalog (ADR-0070)', () => {
  it.each(audible)('plays the standard sound for %s', (type) => {
    expect(presentNotification(type).sound).toBe(true);
  });

  it.each(silent)('delivers %s silently', (type) => {
    expect(presentNotification(type).sound).toBe(false);
  });

  it.each(privateTypes)('keeps %s off the lock screen', (type) => {
    const { lockScreen } = presentNotification(type);

    expect(lockScreen).not.toBe('entry');
  });

  it.each(
    [...audible, ...silent].filter((type) => !privateTypes.includes(type)),
  )('shows the inbox text of %s', (type) => {
    expect(presentNotification(type).lockScreen).toBe('entry');
  });

  it('delivers an uncatalogued type silently with generic copy', () => {
    expect(presentNotification('studio_announcement')).toEqual({
      sound: false,
      lockScreen: {
        title: 'Emma Pilates',
        body: 'Tienes una notificación nueva.',
      },
    });
  });

  it('never puts names, reasons, or amounts in generic copy', () => {
    for (const type of privateTypes) {
      const { lockScreen } = presentNotification(type);
      if (lockScreen === 'entry') throw new Error(`${type} shows its entry`);
      expect(`${lockScreen.title} ${lockScreen.body}`).not.toMatch(
        /\d|Bs|evaluaci/i,
      );
    }
  });
});
