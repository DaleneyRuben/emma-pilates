import type { PrismaClient } from '../../generated/prisma/client';
import { realPlanSaleWhere } from '../../booking/payments/real-plan-sale';
import { boliviaMonth } from '../../time/bolivia-time';

export type FirstPlan = {
  clientId: string;
  decidedAt: Date;
  amountDueCentavos: number;
  durationDays: number;
  classAllowance: number;
};

const voidedInItsMonth = (sale: {
  decidedAt: Date | null;
  voidedAt: Date | null;
}): boolean =>
  sale.voidedAt !== null &&
  boliviaMonth(sale.voidedAt).getTime() ===
    boliviaMonth(sale.decidedAt as Date).getTime();

// A Client's first real Plan (booking's real-sale rule). A first sale voided
// after its month was over stays her first, since its commission may have
// been paid, so a later sale opens no second one.
export const readFirstPlans = async (
  prisma: PrismaClient,
): Promise<Map<string, FirstPlan>> => {
  const sales = await prisma.payment.findMany({
    where: {
      ...realPlanSaleWhere,
      state: { in: ['CONFIRMED', 'VOIDED'] },
      decidedAt: { not: null },
    },
    select: {
      clientId: true,
      state: true,
      decidedAt: true,
      voidedAt: true,
      amountDueCentavos: true,
      durationDaysSnapshot: true,
      classAllowanceSnapshot: true,
    },
    orderBy: [{ decidedAt: 'asc' }, { id: 'asc' }],
  });
  const firsts = new Map<string, FirstPlan | null>();
  for (const sale of sales) {
    if (firsts.has(sale.clientId)) continue;
    // Voided within the month it was sold, no pay for it was approved yet
    // (a month is paid once it is over): the next real Plan is her first.
    if (sale.state === 'VOIDED' && voidedInItsMonth(sale)) continue;
    firsts.set(
      sale.clientId,
      sale.state === 'VOIDED'
        ? null
        : {
            clientId: sale.clientId,
            decidedAt: sale.decidedAt as Date,
            amountDueCentavos: sale.amountDueCentavos,
            durationDays: sale.durationDaysSnapshot,
            classAllowance: sale.classAllowanceSnapshot,
          },
    );
  }
  return new Map(
    [...firsts].flatMap(([clientId, first]) =>
      first === null ? [] : [[clientId, first] as const],
    ),
  );
};
