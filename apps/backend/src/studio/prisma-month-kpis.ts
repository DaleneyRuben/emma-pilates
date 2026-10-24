import type { PrismaClient } from '../generated/prisma/client';
import type { MonthKpiCounts } from './month-kpis';

export const readMonthKpis = (
  prisma: PrismaClient,
  input: { month: Date },
): Promise<MonthKpiCounts> => {
  void prisma;
  void input;
  return Promise.reject(new Error('month kpis are not read yet'));
};
