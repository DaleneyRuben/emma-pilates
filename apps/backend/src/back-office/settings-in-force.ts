import type { Prisma, PrismaClient } from '../generated/prisma/client';

type Database = PrismaClient | Prisma.TransactionClient;

// The Studio Settings version in force for a month: the newest one saved
// before the month ended, so a later change never rewrites a closed month.
// Before any version that old, the first one.
export const settingsInForce = async (database: Database, monthEnd: Date) =>
  (await database.studioSettingsVersion.findFirst({
    where: { createdAt: { lt: monthEnd } },
    orderBy: { version: 'desc' },
  })) ??
  database.studioSettingsVersion.findFirst({ orderBy: { version: 'asc' } });
