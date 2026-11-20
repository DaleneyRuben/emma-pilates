import { Prisma } from '../../generated/prisma/client';
import type { ClientDirectoryFilter } from './administrator-clients';

const civil = (date: Date): string => date.toISOString().slice(0, 10);

// The same "active" as the Client's own Mi plan and the directory's
// `activeOn`: an active Subscription whose Bolivia date range includes today.
// The date travels as text so the session time zone cannot shift it.
const activeSubscription = (today: Date) => Prisma.sql`EXISTS (
  SELECT 1 FROM booking.subscriptions s
  WHERE s.client_id = c.id AND s.state = 'active'
    AND s.starts_on <= ${civil(today)}::date
    AND s.ends_on >= ${civil(today)}::date)`;

// The renewal reminder's window: her Mi plan says «expiring soon» while 3
// days or fewer remain (client-subscription.ts).
const expiringWindowDays = 3;

// FIX-091 (W8 A): «Por vencer», an active Subscription ending within the
// window.
const expiringSubscription = (today: Date) => Prisma.sql`EXISTS (
  SELECT 1 FROM booking.subscriptions s
  WHERE s.client_id = c.id AND s.state = 'active'
    AND s.starts_on <= ${civil(today)}::date
    AND s.ends_on >= ${civil(today)}::date
    AND s.ends_on <= ${civil(today)}::date + ${expiringWindowDays}::int)`;

// A place she keeps in a class that has not started yet.
const classAhead = (now: Date) => Prisma.sql`EXISTS (
  SELECT 1 FROM booking.bookings b
  JOIN booking.sessions ss ON ss.id = b.session_id
  WHERE b.client_id = c.id AND b.state = 'booked'
    AND ss.state = 'scheduled' AND ss.starts_at > ${now})`;

const anySubscription = Prisma.sql`EXISTS (
  SELECT 1 FROM booking.subscriptions s WHERE s.client_id = c.id)`;

// A reserved place is not hers yet and a lost one is no longer (booking
// ADR-0008).
const liveFounderPlace = Prisma.sql`EXISTS (
  SELECT 1 FROM booking.founder_memberships f
  WHERE f.client_id = c.id AND f.status = 'active' AND f.deleted_at IS NULL)`;

// WEB-040: Clientas › Todas's chips as a condition on the directory's
// `booking.clients c`. `expired` and `none` mirror the row's
// `subscriptionStatus`; FIX-091's «Sin reservar» is an active Plan with no
// class ahead of `now`.
export const directoryFilterCondition = (
  filter: ClientDirectoryFilter | undefined,
  today: Date,
  now: Date,
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
    case 'expiring':
      return Prisma.sql`AND ${expiringSubscription(today)}`;
    case 'unbooked':
      return Prisma.sql`AND ${activeSubscription(today)} AND NOT ${classAhead(now)}`;
    default:
      return Prisma.empty;
  }
};
