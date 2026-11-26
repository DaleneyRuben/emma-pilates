import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';
import type { NotificationSubject } from './prisma-notification-subjects';
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

/** A listed notification; review and feedback notices say what they are about. */
export type NotificationItem = NotificationRecord &
  Partial<NotificationSubject>;

export type NotificationPage = {
  items: NotificationItem[];
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
  /** Walkthrough n.º 11 and 12: what each review or feedback notice is about. */
  describe?(
    items: NotificationRecord[],
  ): Promise<Map<string, NotificationSubject>>;
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
  const records = rows.slice(0, query.limit);
  const hasMore = rows.length > query.limit;
  const last = records.at(-1);
  const subjects = await dependencies.describe?.(records);
  const items: NotificationItem[] =
    subjects === undefined
      ? records
      : records.map((record) => ({
          ...record,
          review: subjects.get(record.id)?.review ?? null,
          feedback: subjects.get(record.id)?.feedback ?? null,
        }));

  return {
    items,
    hasMore,
    nextCursor:
      hasMore && last !== undefined
        ? encodeNotificationCursor({ createdAt: last.createdAt, id: last.id })
        : null,
  };
};
