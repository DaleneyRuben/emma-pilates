import { nutritionistCostOfMonth } from '../../booking/evaluations/evaluation-payment';
import type { PrismaClient } from '../../generated/prisma/client';
import type { MonthFacts } from './prisma-finance';

// The one place Back Office asks Booking for a month's facts (ADR-0103).
export const monthFacts = async (
  prisma: PrismaClient,
  from: Date,
  until: Date,
): Promise<MonthFacts> => {
  const [settings, payments, nutritionistCostCentavos] = await Promise.all([
    prisma.studioSettingsVersion.findFirst({
      orderBy: { version: 'desc' },
      select: { taxRatePercent: true },
    }),
    prisma.payment.findMany({
      where: { state: 'CONFIRMED', decidedAt: { gte: from, lt: until } },
      select: { amountDueCentavos: true },
    }),
    nutritionistCostOfMonth(prisma, from),
  ]);
  return {
    taxRatePercent: settings?.taxRatePercent ?? 16,
    cashIncomeCentavos: payments.reduce(
      (total, payment) => total + payment.amountDueCentavos,
      0,
    ),
    nutritionistCostCentavos,
  };
};
