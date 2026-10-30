import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { realPlanSaleSql } from './real-plan-sale';

type Database = PrismaClient | Prisma.TransactionClient;

export type PlanRenewal = {
  clientId: string;
  subscriptionId: string;
  endsOn: Date;
  renewed: boolean;
};

// A real Plan ends or renews; a voided sale does neither.
const realPlanSale = (alias: string) =>
  `${alias}.state = 'confirmed' AND ${realPlanSaleSql(alias)}`;

// Owner decision 5 (2026-10-28), one definition for the Coordinator's bonus
// and the KPIs: a real Plan ending in the month renewed when another real
// Plan was bought after it and approved (Bolivia date) before its end or up
// to 7 days after it, whatever Start Date she chose.
export const readPlanRenewals = (
  database: Database,
  month: Date,
  until: Date,
): Promise<PlanRenewal[]> =>
  database.$queryRawUnsafe<PlanRenewal[]>(
    `SELECT s.client_id AS "clientId", s.id AS "subscriptionId",
            s.ends_on AS "endsOn",
            EXISTS (
              SELECT 1
              FROM booking.payments n
              WHERE n.client_id = s.client_id
                AND n.id <> p.id
                AND ${realPlanSale('n')}
                AND n.decided_at > p.decided_at
                AND (n.decided_at AT TIME ZONE 'America/La_Paz')::date
                    <= s.ends_on + 7
            ) AS renewed
     FROM booking.subscriptions s
     JOIN booking.payments p ON p.id = s.payment_id
     WHERE s.ends_on >= $1::date
       AND s.ends_on < $2::date
       AND s.ended_by_void = false
       AND ${realPlanSale('p')}`,
    month.toISOString().slice(0, 10),
    until.toISOString().slice(0, 10),
  );

export const renewalRateOf = (renewals: PlanRenewal[]): number | null =>
  renewals.length === 0
    ? null
    : Math.round(
        (renewals.filter((plan) => plan.renewed).length * 100) /
          renewals.length,
      );
