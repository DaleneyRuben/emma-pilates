import { nutritionistCostOfMonth } from '../../booking/evaluations/nutritionist-cost';
import type { PrismaClient } from '../../generated/prisma/client';
import { boliviaInstant } from '../../time/bolivia-time';
import { settingsInForce } from '../settings-in-force';
import type { MonthFacts } from './prisma-finance';

// The one place Back Office asks Booking for a month's facts (ADR-0103).
export const monthFacts = async (
  prisma: PrismaClient,
  from: Date,
  until: Date,
): Promise<MonthFacts> => {
  // The month is cut in Bolivia time, and its tax is the one in force then.
  const window = {
    from: boliviaInstant(from, 0),
    until: boliviaInstant(until, 0),
  };
  const [settings, payments, nutritionistCostCentavos] = await Promise.all([
    settingsInForce(prisma, window.until),
    prisma.payment.findMany({
      where: {
        state: 'CONFIRMED',
        decidedAt: { gte: window.from, lt: window.until },
      },
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
