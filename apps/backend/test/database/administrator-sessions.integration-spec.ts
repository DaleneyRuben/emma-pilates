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
        branchName: expect.any(String),
        classTypeName: expect.any(String),
        trainerName: expect.any(String),
        availableSeats: expect.any(Number),
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
});
