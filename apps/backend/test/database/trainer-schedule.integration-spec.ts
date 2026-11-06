import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import { findTrainerScheduleSessions } from '../../src/booking/trainer-schedule-sessions';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const day = 24 * 60 * 60 * 1_000;

// The Bolivian civil day that holds an instant, as the agenda's `on` date.
const civilDay = (instant: Date) =>
  new Date(
    `${new Date(instant.getTime() - 4 * 60 * 60 * 1_000).toISOString().slice(0, 10)}T00:00:00.000Z`,
  );

describe("The Trainer's agenda (FIX-042)", () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today: new Date() });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, { fixtures, passwordHash: 'x' });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('lists the day’s cancelled classes with their cause only when asked, never the ones a series change withdrew', async () => {
    const first = await prisma.session.findFirstOrThrow({
      where: {
        state: 'SCHEDULED',
        startsAt: { gte: new Date(Date.now() + 2 * day) },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    const on = civilDay(first.startsAt);
    const start = new Date(on.getTime() + 4 * 60 * 60 * 1_000);
    const sameDay = {
      trainerStaffMemberId: first.trainerStaffMemberId,
      startsAt: { gte: start, lt: new Date(start.getTime() + day) },
    };
    const account = await prisma.account.findFirstOrThrow();
    const extra = await prisma.session.create({
      data: {
        branchId: first.branchId,
        classTypeId: first.classTypeId,
        trainerStaffMemberId: first.trainerStaffMemberId,
        startsAt: new Date(start.getTime() + 23 * 60 * 60 * 1_000),
        endsAt: new Date(
          start.getTime() + 23 * 60 * 60 * 1_000 + 50 * 60 * 1_000,
        ),
        capacity: 10,
        isException: true,
        state: 'CANCELLED',
        cancellationCause: 'SCHEDULE_CHANGED',
        cancelledAt: new Date(),
        cancelledByAccountId: account.id,
      },
    });
    const cancelledAt = new Date();
    await prisma.session.update({
      where: { id: first.id },
      data: {
        state: 'CANCELLED',
        cancellationCause: 'MINIMUM_NOT_MET',
        cancelledAt,
      },
    });
    const scheduled = await prisma.session.count({
      where: { ...sameDay, state: 'SCHEDULED' },
    });

    const withCancelled = await findTrainerScheduleSessions(prisma)({
      trainerStaffMemberId: first.trainerStaffMemberId,
      on,
      includeCancelled: true,
    });
    expect(withCancelled).toHaveLength(scheduled + 1);
    expect(
      withCancelled.find((session) => session.sessionId === first.id),
    ).toEqual(
      expect.objectContaining({
        cancellation: { cause: 'minimum_not_met', cancelledAt, bookedCount: 0 },
      }),
    );
    expect(withCancelled.map((session) => session.sessionId)).not.toContain(
      extra.id,
    );

    const standingOnly = await findTrainerScheduleSessions(prisma)({
      trainerStaffMemberId: first.trainerStaffMemberId,
      on,
      includeCancelled: false,
    });
    expect(standingOnly).toHaveLength(scheduled);
    expect(standingOnly.every((session) => session.cancellation === null)).toBe(
      true,
    );
  });
});
