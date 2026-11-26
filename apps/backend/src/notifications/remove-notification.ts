import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import { NotificationNotFoundError } from './mark-notification-read';

const dayMilliseconds = 24 * 60 * 60 * 1000;
// Walkthrough n.º 10: the list keeps a month; older ones leave by themselves.
const notificationLifetimeDays = 30;
// «Deshacer» shows for a few seconds; the server allows a little more.
const undoWindowMilliseconds = 2 * 60 * 1000;

/** The oldest moment a notification still shows in the list and the count. */
export const notificationCutoff = (now: Date): Date =>
  new Date(now.getTime() - notificationLifetimeDays * dayMilliseconds);

type RemoveDependencies = {
  principal: AuthenticatedPrincipal;
  remove(input: {
    notificationId: string;
    accountId: string;
    removedAt: Date;
  }): Promise<number>;
  now(): Date;
};

type RestoreDependencies = {
  principal: AuthenticatedPrincipal;
  restore(input: {
    notificationId: string;
    accountId: string;
    removedSince: Date;
  }): Promise<number>;
  now(): Date;
};

// Removal hides one of her own notifications (C19c, E-F15); nothing is
// deleted (ADR-0086).
export const removeNotification = async (
  command: { notificationId: string },
  dependencies: RemoveDependencies,
): Promise<void> => {
  const removed = await dependencies.remove({
    notificationId: command.notificationId,
    accountId: dependencies.principal.accountId,
    removedAt: dependencies.now(),
  });
  if (removed !== 1) throw new NotificationNotFoundError();
};

// «Deshacer» (C19d) brings back a notification removed moments ago.
export const restoreNotification = async (
  command: { notificationId: string },
  dependencies: RestoreDependencies,
): Promise<void> => {
  const restored = await dependencies.restore({
    notificationId: command.notificationId,
    accountId: dependencies.principal.accountId,
    removedSince: new Date(
      dependencies.now().getTime() - undoWindowMilliseconds,
    ),
  });
  if (restored !== 1) throw new NotificationNotFoundError();
};
