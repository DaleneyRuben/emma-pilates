import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const instant = new Date('2026-09-22T04:20:16.474Z');

describe('Prisma timestamptz handling', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('reads timestamptz values as the stored instant whatever the server time zone is', async () => {
    const [row] = await prisma.$queryRaw<[{ instant: Date }]>`
      select '2026-09-22T04:20:16.474Z'::timestamptz as instant
    `;

    expect(row.instant.toISOString()).toBe(instant.toISOString());
  });

  it('writes Date parameters as the same instant the database stores', async () => {
    const [row] = await prisma.$queryRaw<[{ utc: string }]>`
      select to_char(
        ${instant}::timestamptz at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      ) as utc
    `;

    expect(row.utc).toBe(instant.toISOString());
  });
});
