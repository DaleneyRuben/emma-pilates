import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { readMonthKpis } from '../../src/studio/prisma-month-kpis';
import { recomputeStudioFacts } from '../../src/studio/prisma-studio-facts';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';
import {
  insertClient,
  insertSoldSubscription,
  seedStudioWorld,
} from './studio-facts-test-support';

const month = new Date('2026-10-01T00:00:00.000Z');

// FIX-008 (review 2026-10-28): a guest pass, Courtesy Access, and a voided
// sale give a Subscription but not a Client who bought a Plan.
describe('studio facts count only Clients with a sold Plan', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('gives plan days only to the Client whose Plan was sold and stands', async () => {
    const world = await seedStudioWorld(context);
    const term = { startsOn: '2026-10-01', endsOn: '2026-10-30' };
    const buyer = await insertClient(context);
    await insertSoldSubscription(context, world, {
      clientId: buyer,
      ...term,
      method: 'cash',
      paymentState: 'confirmed',
    });
    const courtesy = await insertClient(context);
    await insertSoldSubscription(context, world, {
      clientId: courtesy,
      ...term,
      method: 'courtesy',
      paymentState: 'confirmed',
    });
    const guest = await insertClient(context);
    const guestPass = await insertSoldSubscription(context, world, {
      clientId: guest,
      ...term,
      method: 'courtesy',
      paymentState: 'confirmed',
    });
    await context.pool.query(
      `INSERT INTO booking.guest_passes
         (id, host_client_id, friend_client_id, courtesy_subscription_id)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), buyer, guest, guestPass],
    );
    const voided = await insertClient(context);
    await insertSoldSubscription(context, world, {
      clientId: voided,
      ...term,
      method: 'cash',
      paymentState: 'voided',
    });

    await recomputeStudioFacts(prisma, {
      month,
      now: () => new Date('2026-10-23T15:00:00.000Z'),
    });

    const facts = await context.pool.query<{
      client_id: string;
      plan_days: number;
    }>(
      `SELECT client_id, plan_days
       FROM studio.client_month_facts
       WHERE deleted_at IS NULL AND month = $1::date`,
      ['2026-10-01'],
    );
    const daysOf = (clientId: string) =>
      facts.rows.find((row) => row.client_id === clientId)?.plan_days ?? 0;
    expect([buyer, courtesy, guest, voided].map(daysOf)).toEqual([30, 0, 0, 0]);
    expect((await readMonthKpis(prisma, { month })).activeClients).toBe(1);
  });
});
