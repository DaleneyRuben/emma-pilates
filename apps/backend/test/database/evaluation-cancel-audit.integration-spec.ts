import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

describe('evaluation cancel payment audit', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(
      world,
      createPrismaEvaluationCommands(world.prisma, { now: () => fixtureNow }),
    ));
  });

  afterAll(async () => {
    await world?.stop();
  });

  const bookPaid = async (email: string, startsAt: string) => {
    await world.prisma.client.create({
      data: {
        name: email,
        referralCode: `REF-${randomUUID().slice(0, 8)}`,
        account: {
          create: {
            email,
            activatedAt: fixtureNow,
            emailVerifiedAt: fixtureNow,
          },
        },
        subscriptions: {
          create: {
            planId: deterministicId('plan:paquete-8'),
            planNameSnapshot: 'Paquete de 8 clases',
            durationDaysSnapshot: 30,
            originalClassAllowance: 8,
            remainingClassAllowance: 8,
            startsOn: new Date('2026-09-01T00:00:00.000Z'),
            endsOn: new Date('2026-11-30T00:00:00.000Z'),
            activatedAt: fixtureNow,
          },
        },
      },
    });
    const client = await world.principalOf(email);
    const slotId = await slotIdAt(world.prisma, mondayBlockId, startsAt);
    return createPrismaEvaluationCommands(world.prisma, {
      now: () => fixtureNow,
    }).bookPaidEvaluation(slotId, client, randomUUID());
  };

  const rejectionAudit = (paymentId: string) =>
    world.prisma.auditRecord.findFirstOrThrow({
      where: {
        actionCode: 'payment.transfer_rejected',
        targetId: paymentId,
      },
      select: {
        actorKind: true,
        actorAccountId: true,
        impersonationId: true,
      },
    });

  it('records the staff member who cancelled a paid evaluation', async () => {
    const booked = await bookPaid(
      'audit-staff@example.com',
      '2026-10-12T13:45:00.000Z',
    );
    if (booked.paymentId === null) {
      throw new Error('A paid Evaluation books with its own Payment');
    }
    const carla = await world.principalOf('carla@example.com');
    await createPrismaEvaluationCommands(world.prisma, {
      now: () => fixtureNow,
    }).cancelEvaluationAsStaff(booked.id, carla);

    await expect(rejectionAudit(booked.paymentId)).resolves.toEqual({
      actorKind: 'ACCOUNT',
      actorAccountId: carla.accountId,
      impersonationId: null,
    });
  });

  it('records the worker when a future hold expires', async () => {
    const booked = await bookPaid(
      'audit-worker@example.com',
      '2026-10-19T13:45:00.000Z',
    );
    if (booked.paymentId === null) {
      throw new Error('A paid Evaluation books with its own Payment');
    }
    await createPrismaEvaluationCommands(world.prisma, {
      now: () => new Date(fixtureNow.getTime() + 25 * 60 * 60 * 1_000),
    }).releaseExpiredEvaluationHolds();

    await expect(rejectionAudit(booked.paymentId)).resolves.toEqual({
      actorKind: 'WORKER',
      actorAccountId: null,
      impersonationId: null,
    });
  });
});
