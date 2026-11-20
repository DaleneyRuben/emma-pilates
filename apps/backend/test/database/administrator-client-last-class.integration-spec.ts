import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdministratorClients } from '../../src/booking/clients/prisma-administrator-clients';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
// 11:00 on 21 September in Bolivia.
const now = new Date('2026-09-21T15:00:00.000Z');

// FIX-091 (W8 A): Clientas' «Última clase» is the Bolivia day of the latest
// class she kept a place in that already started, unless she missed it.
describe('Administrator Client directory «Última clase» (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });
  const template = fixtures.sessions[0];
  const wendy = { id: randomUUID(), name: 'Wendy Ultima' };
  const yolanda = { id: randomUUID(), name: 'Yolanda Ultima' };

  const createClient = async (client: { id: string; name: string }) => {
    await prisma.client.create({
      data: {
        id: client.id,
        name: client.name,
        referralCode: `REF-${client.id.slice(0, 8)}`,
        account: {
          create: {
            email: `${client.id}@example.com`,
            activatedAt: new Date('2026-01-01T12:00:00.000Z'),
          },
        },
      },
    });
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
    await createClient(wendy);
    await createClient(yolanda);
    const plan = await prisma.plan.findFirstOrThrow({ select: { id: true } });
    const subscription = await prisma.subscription.create({
      data: {
        clientId: wendy.id,
        planId: plan.id,
        planNameSnapshot: 'Paquete de 8 clases',
        durationDaysSnapshot: 30,
        originalClassAllowance: 8,
        remainingClassAllowance: 2,
        startsOn: new Date('2026-09-01'),
        endsOn: new Date('2026-09-30'),
        activatedAt: new Date('2026-09-01T12:00:00.000Z'),
      },
    });
    const wendyAccount = await prisma.account.findFirstOrThrow({
      where: { clientId: wendy.id },
      select: { id: true },
    });
    const book = async (
      startsAt: string,
      shape: {
        outcome?: 'ATTENDED' | 'NO_SHOW';
        bookingCancelled?: true;
        sessionCancelled?: true;
      } = {},
    ) => {
      const starts = new Date(startsAt);
      const session = await prisma.session.create({
        data: {
          branchId: template.branchId,
          classTypeId: template.classTypeId,
          trainerStaffMemberId: template.trainerStaffMemberId,
          startsAt: starts,
          endsAt: new Date(starts.getTime() + 50 * 60 * 1_000),
          capacity: 8,
          isException: true,
          ...(shape.sessionCancelled
            ? {
                state: 'CANCELLED',
                cancelledAt: starts,
                cancellationCause: 'MINIMUM_NOT_MET',
              }
            : {}),
        },
      });
      const booking = await prisma.booking.create({
        data: {
          sessionId: session.id,
          clientId: wendy.id,
          subscriptionId: subscription.id,
          createdByAccountId: wendyAccount.id,
          ...(shape.bookingCancelled
            ? {
                state: 'CANCELLED',
                cancelledAt: new Date('2027-01-01T00:00:00.000Z'),
                cancelledByAccountId: wendyAccount.id,
                cancellationCause: 'CLIENT_REQUEST',
              }
            : {}),
        },
      });
      if (shape.outcome !== undefined) {
        await prisma.attendanceRecord.create({
          data: {
            bookingId: booking.id,
            outcome: shape.outcome,
            recordedByAccountId: wendyAccount.id,
            recordedAt: new Date(starts.getTime() + 60 * 60 * 1_000),
          },
        });
      }
    };

    await book('2026-09-18T23:30:00.000Z', { outcome: 'ATTENDED' });
    // 23:00 on 19 September in Bolivia, already the 20th in UTC; nobody
    // recorded her attendance, so the place she kept counts.
    await book('2026-09-20T03:00:00.000Z');
    await book('2026-09-20T13:00:00.000Z', { outcome: 'NO_SHOW' });
    await book('2026-09-20T14:00:00.000Z', { bookingCancelled: true });
    await book('2026-09-21T12:00:00.000Z', { sessionCancelled: true });
    // Later today: still ahead.
    await book('2026-09-21T20:00:00.000Z');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('names the latest class she kept that already started, and null without one', async () => {
    const page = await createPrismaAdministratorClients(prisma).list({
      page: 1,
      pageSize: 20,
      query: 'Ultima',
      today,
      now,
    });

    expect(
      page.items.map(({ name, lastClassOn }) => ({ name, lastClassOn })),
    ).toEqual([
      { name: wendy.name, lastClassOn: new Date('2026-09-19T00:00:00.000Z') },
      { name: yolanda.name, lastClassOn: null },
    ]);
  });
});
