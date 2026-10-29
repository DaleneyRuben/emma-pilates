import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
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

describe('no show evaluation payment', () => {
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

  it('confirms a transfer after the Evaluation is marked no show', async () => {
    await world.prisma.client.create({
      data: {
        name: 'Noemi Paz',
        referralCode: `REF-${randomUUID().slice(0, 8)}`,
        account: {
          create: {
            email: 'noemi@example.com',
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
    const client = await world.principalOf('noemi@example.com');
    const slotId = await slotIdAt(
      world.prisma,
      mondayBlockId,
      '2026-10-12T16:00:00.000Z',
    );
    const booked = await createPrismaEvaluationCommands(world.prisma, {
      now: () => fixtureNow,
    }).bookPaidEvaluation(slotId, client, randomUUID());
    if (booked.paymentId === null) {
      throw new Error('A paid Evaluation books with its own Payment');
    }
    await world.prisma.evaluation.update({
      where: { id: booked.id },
      data: { state: 'NO_SHOW', nutritionistCostCentavos: 5_000 },
    });

    await createPrismaPaymentCommands(world.prisma, {
      now: () => fixtureNow,
    }).confirmTransfer(
      { paymentId: booked.paymentId },
      await world.principalOf('paola.mendoza@example.com'),
    );

    await expect(
      world.prisma.payment.findUniqueOrThrow({
        where: { id: booked.paymentId },
        select: { state: true },
      }),
    ).resolves.toEqual({ state: 'CONFIRMED' });
  });
});
