import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('Client class history', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });
  const lucia = fixtures.clients.find((c) => c.email === 'lucia@example.com')!;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
    await prisma.attendanceRecord.deleteMany({
      where: { booking: { clientId: lucia.id } },
    });
    await prisma.booking.deleteMany({ where: { clientId: lucia.id } });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('lists attended past Bookings with Session facts, newest first', async () => {
    const template = fixtures.sessions[0];
    const trainerAccount = await prisma.account.findFirstOrThrow({
      where: { email: 'emma.vargas@example.com', deletedAt: null },
      select: { id: true },
    });
    const luciaAccount = await prisma.account.findFirstOrThrow({
      where: { email: lucia.email, deletedAt: null },
      select: { id: true },
    });
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { clientId: lucia.id, state: 'ACTIVE' },
      select: { id: true },
    });
    const pastStarts = [
      new Date('2026-08-19T11:00:00.000Z'),
      new Date('2026-08-26T11:00:00.000Z'),
    ];

    for (const [index, startsAt] of pastStarts.entries()) {
      const session =
        (await prisma.session.findFirst({
          where: { branchId: template.branchId, startsAt },
        })) ??
        (await prisma.session.create({
          data: {
            branchId: template.branchId,
            classTypeId: template.classTypeId,
            trainerStaffMemberId: template.trainerStaffMemberId,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 50 * 60 * 1_000),
            capacity: 12,
            isException: true,
          },
        }));
      const booking = await prisma.booking.create({
        data: {
          sessionId: session.id,
          clientId: lucia.id,
          subscriptionId: subscription.id,
          createdByAccountId: luciaAccount.id,
        },
      });
      if (index === 0) {
        await prisma.attendanceRecord.create({
          data: {
            bookingId: booking.id,
            outcome: 'ATTENDED',
            recordedByAccountId: trainerAccount.id,
            recordedAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
          },
        });
      } else {
        await prisma.attendanceRecord.create({
          data: {
            bookingId: booking.id,
            outcome: 'NO_SHOW',
            recordedByAccountId: trainerAccount.id,
            recordedAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
          },
        });
      }
    }

    const history = await createCatalogRepository(prisma).findAttendedBookings(
      lucia.id,
    );

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      sessionId: expect.any(String) as string,
      classTypeName: 'Reformer Pilates',
      trainerName: 'Emma Vargas',
      branchName: 'Centro',
      startsAt: pastStarts[0],
    });
  });
});
