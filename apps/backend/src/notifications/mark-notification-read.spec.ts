import {
  markAllNotificationsRead,
  markNotificationRead,
  NotificationNotFoundError,
} from './mark-notification-read';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const now = new Date('2026-09-21T12:00:00.000Z');

describe('markNotificationRead', () => {
  it('marks the Account’s own notification as read', async () => {
    const markRead = jest.fn().mockResolvedValue(1);

    await markNotificationRead(
      { notificationId: 'notification-id' },
      { principal, markRead, now: () => now },
    );

    expect(markRead).toHaveBeenCalledWith({
      notificationId: 'notification-id',
      accountId: 'account-id',
      readAt: now,
    });
  });

  it('reports a missing or foreign notification without revealing which', async () => {
    await expect(
      markNotificationRead(
        { notificationId: 'notification-id' },
        { principal, markRead: jest.fn().mockResolvedValue(0), now: () => now },
      ),
    ).rejects.toBeInstanceOf(NotificationNotFoundError);
  });
});

describe('markAllNotificationsRead', () => {
  it('marks every unread notification of the Account', async () => {
    const markAllRead = jest.fn().mockResolvedValue(3);

    await expect(
      markAllNotificationsRead({ principal, markAllRead, now: () => now }),
    ).resolves.toEqual({ marked: 3 });
    expect(markAllRead).toHaveBeenCalledWith({
      accountId: 'account-id',
      readAt: now,
    });
  });
});
