import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { PaymentState } from '../../src/generated/prisma/client';
import {
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

// Walkthrough finding 64: a Paid Evaluation whose transfer is still under
// review can be rescheduled as well as cancelled.
describe('a paid evaluation under review', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;
  // A Client holds one pending evaluation payment at a time.
  let booked: { id: string; paymentId: string | null };
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => fixtureNow });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, commands()));
    booked = await commands().bookPaidEvaluation(
      await slotIdAt(world.prisma, mondayBlockId, '2026-09-28T13:00:00.000Z'),
      await world.principalOf('lucia@example.com'),
      randomUUID(),
    );
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lists the evaluation as reschedulable and cancellable', async () => {
    const page = await commands().listClientEvaluations(
      { scope: 'upcoming' },
      await world.principalOf('lucia@example.com'),
    );

    expect(page.items.find((item) => item.id === booked.id)).toMatchObject({
      included: false,
      reschedulable: true,
      cancellable: true,
    });
  });

  it('moves the evaluation to another slot and keeps the payment under review', async () => {
    const next = await slotIdAt(
      world.prisma,
      mondayBlockId,
      '2026-09-28T14:30:00.000Z',
    );

    const moved = await commands().rescheduleClientEvaluation(
      booked.id,
      next,
      await world.principalOf('lucia@example.com'),
      randomUUID(),
    );

    expect(moved).toMatchObject({
      slotId: next,
      paymentId: booked.paymentId,
    });
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: booked.id },
        select: {
          evaluationSlotId: true,
          payment: { select: { state: true } },
        },
      }),
    ).resolves.toEqual({
      evaluationSlotId: next,
      payment: { state: PaymentState.PENDING },
    });
  });
});
