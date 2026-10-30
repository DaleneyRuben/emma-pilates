import type { PrismaClient } from '../../generated/prisma/client';

export type FirstPlan = {
  clientId: string;
  decidedAt: Date;
  amountDueCentavos: number;
  durationDays: number;
  classAllowance: number;
};

// A Client's first real Plan: her first cash or transfer sale of more than
// one class at a price. A single class is not a Plan. A voided first sale
// stays her first, so a later sale opens no second commission. REL-016's
// store-review flag joins this filter once the column exists.
export const readFirstPlans = async (
  prisma: PrismaClient,
): Promise<Map<string, FirstPlan>> => {
  const sales = await prisma.payment.findMany({
    where: {
      kind: 'PLAN',
      state: { in: ['CONFIRMED', 'VOIDED'] },
      method: { in: ['TRANSFER', 'CASH'] },
      planPriceCentavos: { gt: 0 },
      classAllowanceSnapshot: { gt: 1 },
      decidedAt: { not: null },
    },
    select: {
      clientId: true,
      state: true,
      decidedAt: true,
      amountDueCentavos: true,
      durationDaysSnapshot: true,
      classAllowanceSnapshot: true,
    },
    orderBy: [{ decidedAt: 'asc' }, { id: 'asc' }],
  });
  const firsts = new Map<string, FirstPlan | null>();
  for (const sale of sales) {
    if (firsts.has(sale.clientId)) continue;
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
