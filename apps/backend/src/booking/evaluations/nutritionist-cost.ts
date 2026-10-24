import type { Prisma } from '../../generated/prisma/client';

type Reader = Pick<Prisma.TransactionClient, 'evaluation'>;

// Booking's read for one month's Nutritionist cost. Back Office asks through
// this slice and never reads the evaluation table itself (ADR-0103).
export const nutritionistCostOfMonth = async (
  reader: Reader,
  month: Date,
): Promise<number> => {
  const rows = await reader.evaluation.findMany({
    where: {
      nutritionistCostCentavos: { not: null },
      slot: { localMonth: month },
    },
    select: { nutritionistCostCentavos: true },
  });
  return rows.reduce(
    (total, row) => total + (row.nutritionistCostCentavos ?? 0),
    0,
  );
};
