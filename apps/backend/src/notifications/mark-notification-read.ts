import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';

export class NotificationNotFoundError extends Error {
  constructor() {
    super('Notification not found');
  }
}

type MarkNotificationReadDependencies = {
  principal: AuthenticatedPrincipal;
  markRead(input: {
    notificationId: string;
    accountId: string;
    readAt: Date;
  }): Promise<number>;
  now(): Date;
};

type MarkAllNotificationsReadDependencies = {
  principal: AuthenticatedPrincipal;
  markAllRead(input: { accountId: string; readAt: Date }): Promise<number>;
  now(): Date;
};

export const markNotificationRead = async (
  command: { notificationId: string },
  dependencies: MarkNotificationReadDependencies,
): Promise<void> => {
  const marked = await dependencies.markRead({
    notificationId: command.notificationId,
    accountId: dependencies.principal.accountId,
    readAt: dependencies.now(),
  });

  if (marked !== 1) {
    throw new NotificationNotFoundError();
  }
};

export const markAllNotificationsRead = async (
  dependencies: MarkAllNotificationsReadDependencies,
): Promise<{ marked: number }> => ({
  marked: await dependencies.markAllRead({
    accountId: dependencies.principal.accountId,
    readAt: dependencies.now(),
  }),
});
