import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  listSessionAvailability,
  listSessionsAcrossBranches,
} from '../../src/booking/session-availability';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const day = 24 * 60 * 60 * 1_000;

describe('Sessions across every Branch', () => {
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

  it('lists scheduled Sessions of every Branch in start order with the Branch name, skipping cancelled ones', async () => {
    const from = new Date();
    const until = new Date(from.getTime() + 7 * day);
    const cancelled = await prisma.session.findFirstOrThrow({
      where: { startsAt: { gte: from, lt: until } },
      orderBy: { startsAt: 'asc' },
    });
    await prisma.session.update({
      where: { id: cancelled.id },
      data: {
        state: 'CANCELLED',
        cancellationCause: 'ZERO_BOOKINGS',
        cancelledAt: from,
      },
    });

    const sessions = await listSessionsAcrossBranches(prisma)({
      from,
      until,
      limit: 100,
    });

    const expected = await prisma.session.count({
      where: { state: 'SCHEDULED', startsAt: { gte: from, lt: until } },
    });
    expect(sessions).toHaveLength(Math.min(expected, 100));
    expect(
      new Set(sessions.map((session) => session.branchName)).size,
    ).toBeGreaterThan(1);
    expect(sessions.map((session) => session.id)).not.toContain(cancelled.id);
    const starts = sessions.map((session) => session.startsAt.getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(sessions[0]).toEqual(
      expect.objectContaining({
        branchName: expect.any(String) as string,
        classTypeName: expect.any(String) as string,
        trainerName: expect.any(String) as string,
        availableSeats: expect.any(Number) as number,
      }),
    );
  });

  it('narrows to one Branch for the admin week grid and says which Sessions a weekly schedule generated', async () => {
    const from = new Date();
    const until = new Date(from.getTime() + 7 * day);
    const centro = deterministicId('branch:centro');
    const generated = await prisma.session.findFirstOrThrow({
      where: {
        branchId: centro,
        state: 'SCHEDULED',
        sessionScheduleId: { not: null },
        startsAt: { gte: from, lt: until },
      },
      orderBy: { startsAt: 'asc' },
    });

    const sessions = await listSessionsAcrossBranches(prisma)({
      branchId: centro,
      from,
      until,
      limit: 100,
    });

    expect(sessions.length).toBeGreaterThan(0);
    expect(new Set(sessions.map((session) => session.branchId))).toEqual(
      new Set([centro]),
    );
    expect(sessions.find((session) => session.id === generated.id)).toEqual(
      expect.objectContaining({
        sessionScheduleId: generated.sessionScheduleId,
        isException: generated.isException,
      }),
    );

    const clientFacing = await listSessionAvailability(prisma)({
      branchId: centro,
      from,
      until,
      limit: 100,
    });
    expect(clientFacing[0]).not.toHaveProperty('sessionScheduleId');
    expect(clientFacing[0]).not.toHaveProperty('isException');
  });

  it('shows the week grid its cancelled Sessions with their cause, keeping the ones a series change withdrew hidden (FIX-042)', async () => {
    const from = new Date(Date.now() + 8 * day);
    const until = new Date(from.getTime() + 7 * day);
    const [minimum, studio, paused, changed] = await prisma.session.findMany({
      where: { state: 'SCHEDULED', startsAt: { gte: from, lt: until } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: 4,
    });
    const account = await prisma.account.findFirstOrThrow();
    const cancelledAt = new Date(from.getTime() - day);
    const cancel = (
      id: string,
      cause:
        | 'MINIMUM_NOT_MET'
        | 'NO_SUBSTITUTE_TRAINER'
        | 'SCHEDULE_PAUSED'
        | 'SCHEDULE_CHANGED',
    ) =>
      prisma.session.update({
        where: { id },
        data: {
          state: 'CANCELLED',
          cancellationCause: cause,
          cancelledAt,
          cancelledByAccountId: cause === 'MINIMUM_NOT_MET' ? null : account.id,
        },
      });
    await cancel(minimum.id, 'MINIMUM_NOT_MET');
    await cancel(studio.id, 'NO_SUBSTITUTE_TRAINER');
    await cancel(paused.id, 'SCHEDULE_PAUSED');
    await cancel(changed.id, 'SCHEDULE_CHANGED');
    const subscription = await prisma.subscription.findFirstOrThrow();
    await prisma.booking.create({
      data: {
        sessionId: studio.id,
        clientId: subscription.clientId,
        subscriptionId: subscription.id,
        createdByAccountId: account.id,
        state: 'CANCELLED',
        cancellationCause: 'SESSION_CANCELLED',
        cancelledAt,
      },
    });

    const withCancelled = await listSessionsAcrossBranches(prisma)({
      from,
      until,
      limit: 100,
      includeCancelled: true,
    });
    const byId = new Map(withCancelled.map((session) => [session.id, session]));
    expect(byId.get(minimum.id)?.cancellation).toEqual({
      cause: 'minimum_not_met',
      cancelledAt,
      bookedCount: 0,
    });
    expect(byId.get(studio.id)?.cancellation).toEqual({
      cause: 'studio',
      cancelledAt,
      bookedCount: 1,
    });
    expect(byId.get(paused.id)?.cancellation).toEqual(
      expect.objectContaining({ cause: 'schedule_paused' }),
    );
    expect(byId.has(changed.id)).toBe(false);
    const standing = withCancelled.find((session) => !session.cancellation);
    expect(standing?.cancellation).toBeNull();

    const withoutCancelled = await listSessionsAcrossBranches(prisma)({
      from,
      until,
      limit: 100,
    });
    expect(
      withoutCancelled.filter((session) =>
        [minimum.id, studio.id, paused.id].includes(session.id),
      ),
    ).toEqual([]);
  });
});
