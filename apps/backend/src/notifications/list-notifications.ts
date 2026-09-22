import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import {
  decodeNotificationCursor,
  encodeNotificationCursor,
  type NotificationCursor,
} from './notification-cursor';

export type NotificationCategory =
  'booking_schedule' | 'reminder' | 'subscription_payment' | 'announcement';

export type NotificationRecord = {
  id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  destinationType: string | null;
  destinationId: string | null;
  createdAt: Date;
  readAt: Date | null;
};

export type NotificationPage = {
  items: NotificationRecord[];
  hasMore: boolean;
  nextCursor: string | null;
};

type ListNotificationsDependencies = {
  principal: AuthenticatedPrincipal;
  findPage(input: {
    accountId: string;
    after: NotificationCursor | null;
    limit: number;
  }): Promise<NotificationRecord[]>;
};

export const listNotifications = async (
  query: { limit: number; cursor: string | null },
  dependencies: ListNotificationsDependencies,
): Promise<NotificationPage> => {
  const after =
    query.cursor === null ? null : decodeNotificationCursor(query.cursor);

  if (query.cursor !== null && after === null) {
    throw new Error('Invalid notification cursor');
  }

  const rows = await dependencies.findPage({
    accountId: dependencies.principal.accountId,
    after,
    limit: query.limit + 1,
  });
  const items = rows.slice(0, query.limit);
  const hasMore = rows.length > query.limit;
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor:
      hasMore && last !== undefined
        ? encodeNotificationCursor({ createdAt: last.createdAt, id: last.id })
        : null,
  };
};
