import type { Prisma } from '../../generated/prisma/client';

// REL-016 marks store-review Accounts. Their sales never count toward income,
// first-plan rules, renewals, or pay. This is where that flag joins every
// such filter once the column exists; until then it excludes nothing.
export const storeReviewExclusion: Prisma.PaymentWhereInput = {};

// Its SQL twin: `TRUE` until REL-016's column exists, when it becomes a
// condition on the sale's Client.
const storeReviewExclusionSql = 'TRUE';

// A real Plan sale: a cash or transfer sale of more than one class at a
// price. A Guest Pass, Courtesy Access, and a single class are not one.
export const realPlanSaleWhere: Prisma.PaymentWhereInput = {
  kind: 'PLAN',
  method: { in: ['TRANSFER', 'CASH'] },
  planPriceCentavos: { gt: 0 },
  classAllowanceSnapshot: { gt: 1 },
  ...storeReviewExclusion,
};

// The same rule for raw SQL over booking.payments under `alias`.
export const realPlanSaleSql = (alias: string): string =>
  `${alias}.kind = 'plan'
   AND ${alias}.method IN ('cash', 'transfer')
   AND ${alias}.plan_price_centavos > 0
   AND ${alias}.class_allowance_snapshot > 1
   AND ${storeReviewExclusionSql}`;
