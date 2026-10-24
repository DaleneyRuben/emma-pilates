import type { PrismaClient } from '../generated/prisma/client';
import { boliviaDate } from '../time/bolivia-time';
import { accrueRevenue, type AccrualPayment } from './accrue-revenue';

export type RevenueMonth = {
  accruedCentavos: number;
  cashCentavos: number;
  deferredCentavos: number;
  classesStillOwed: number;
};

type PaymentRow = {
  id: string;
  amount_centavos: number;
  decided_on: Date;
  starts_on: Date;
  ends_on: Date;
  state: string;
};

// Booking exposes no studio query yet, so Studio Management reads the booking
// schema by name (ADR-0011) and never imports Booking's command modules.
export const readRevenueMonth = async (
  prisma: PrismaClient,
  input: { month: Date; today: Date },
): Promise<RevenueMonth> => {
  const month = new Date(
    Date.UTC(input.month.getUTCFullYear(), input.month.getUTCMonth(), 1),
  );
  const today = boliviaDate(input.today);
  const rows = await prisma.$queryRaw<PaymentRow[]>`
    SELECT p.id,
           p.amount_due_centavos AS amount_centavos,
           (p.decided_at AT TIME ZONE 'America/La_Paz')::date AS decided_on,
           s.starts_on,
           s.ends_on,
           lower(p.state::text) AS state
    FROM booking.payments p
    JOIN booking.subscriptions s ON s.payment_id = p.id
    WHERE p.state = 'confirmed'
  `;
  const owed = await prisma.$queryRaw<{ classes_still_owed: number }[]>`
    SELECT COALESCE(SUM(s.remaining_class_allowance), 0)::int AS classes_still_owed
    FROM booking.subscriptions s
    WHERE s.state = 'active'
      AND s.starts_on <= ${today}::date
      AND s.ends_on >= ${today}::date
  `;
  const payments: AccrualPayment[] = rows.map((row) => ({
    id: row.id,
    amountCentavos: Number(row.amount_centavos),
    decidedOn: row.decided_on,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    state: row.state === 'confirmed' ? 'confirmed' : 'voided',
    // REL-016 has not added the store-review flag. The seam takes it;
    // until the column exists every confirmed Payment is included.
    excludedFromAnalytics: false,
  }));
  return {
    ...accrueRevenue(payments, month, today),
    classesStillOwed: Number(owed[0]?.classes_still_owed ?? 0),
  };
};
