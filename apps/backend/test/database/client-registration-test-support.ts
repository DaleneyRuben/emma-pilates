import { createHmac } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

export type RegistrationWorld = {
  context: DatabaseTestContext;
  prisma: PrismaClient;
  boss: PgBoss;
  stop: () => Promise<void>;
};

// A disposable database with a pg-boss client over its pool, as the
// registration unit of work expects.
export const startRegistrationWorld = async (): Promise<RegistrationWorld> => {
  const context = await startDatabaseTestContext();
  const prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  const boss = new PgBoss({
    db: {
      executeSql: async (text, values) => {
        const result = await context.pool.query(text, values);
        return { rows: result.rows };
      },
    },
    schema: 'pgboss',
    migrate: false,
  });
  return {
    context,
    prisma,
    boss,
    stop: async () => {
      await prisma.$disconnect();
      await context.stop();
    },
  };
};

export const digestTestEmail = (email: string): Buffer =>
  createHmac('sha256', 'test-email-digest-key').update(email).digest();
