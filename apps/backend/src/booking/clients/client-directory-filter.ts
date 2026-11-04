import { Prisma } from '../../generated/prisma/client';
import type { ClientDirectoryFilter } from './administrator-clients';

// The same "active" as the Client's own Mi plan and the directory's
// `activeOn`: an active Subscription whose Bolivia date range includes today.
// The date travels as text so the session time zone cannot shift it.
const activeSubscription = (today: Date) => Prisma.sql`EXISTS (
  SELECT 1 FROM booking.subscriptions s
  WHERE s.client_id = c.id AND s.state = 'active'
    AND s.starts_on <= ${today.toISOString().slice(0, 10)}::date
    AND s.ends_on >= ${today.toISOString().slice(0, 10)}::date)`;

const anySubscription = Prisma.sql`EXISTS (
  SELECT 1 FROM booking.subscriptions s WHERE s.client_id = c.id)`;

// A reserved place is not hers yet and a lost one is no longer (booking
// ADR-0008).
const liveFounderPlace = Prisma.sql`EXISTS (
  SELECT 1 FROM booking.founder_memberships f
  WHERE f.client_id = c.id AND f.status = 'active' AND f.deleted_at IS NULL)`;

// WEB-040: Clientas › Todas's chips as a condition on the directory's
// `booking.clients c`. `expired` and `none` mirror the row's
// `subscriptionStatus`.
export const directoryFilterCondition = (
  filter: ClientDirectoryFilter | undefined,
  today: Date,
): Prisma.Sql => {
  switch (filter) {
    case 'active':
      return Prisma.sql`AND ${activeSubscription(today)}`;
    case 'expired':
      return Prisma.sql`AND NOT ${activeSubscription(today)} AND ${anySubscription}`;
    case 'none':
      return Prisma.sql`AND NOT ${anySubscription}`;
    case 'founder':
      return Prisma.sql`AND ${liveFounderPlace}`;
    default:
      return Prisma.empty;
  }
};
