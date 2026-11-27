import { NotificationNotFoundError } from './mark-notification-read';
import {
  notificationCutoff,
  removeNotification,
  restoreNotification,
} from './remove-notification';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const notificationId = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-11-26T15:00:00.000Z');

// Walkthrough n.º 10 (C19c, C19d, E-F15).
describe('removing a notification', () => {
  it('removes her own notification at the current time', async () => {
    const remove = jest.fn().mockResolvedValue(1);

    await removeNotification(
      { notificationId },
      { principal, remove, now: () => now },
    );

    expect(remove).toHaveBeenCalledWith({
      notificationId,
      accountId: 'account-id',
      removedAt: now,
    });
  });

  it('answers not found for a notification she does not have', async () => {
    const remove = jest.fn().mockResolvedValue(0);

    await expect(
      removeNotification(
        { notificationId },
        { principal, remove, now: () => now },
      ),
    ).rejects.toBeInstanceOf(NotificationNotFoundError);
  });

  it('brings back only a notification removed in the last two minutes', async () => {
    const restore = jest.fn().mockResolvedValue(1);

    await restoreNotification(
      { notificationId },
      { principal, restore, now: () => now },
    );

    expect(restore).toHaveBeenCalledWith({
      notificationId,
      accountId: 'account-id',
      removedSince: new Date('2026-11-26T14:58:00.000Z'),
    });

    restore.mockResolvedValue(0);
    await expect(
      restoreNotification(
        { notificationId },
        { principal, restore, now: () => now },
      ),
    ).rejects.toBeInstanceOf(NotificationNotFoundError);
  });

  it('keeps 30 days of notifications', () => {
    expect(notificationCutoff(now)).toEqual(
      new Date('2026-10-27T15:00:00.000Z'),
    );
  });
});
