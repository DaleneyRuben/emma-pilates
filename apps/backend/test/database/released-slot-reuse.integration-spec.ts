import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import {
  civil,
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

// FIX-062 (owner approval 2026-11-17): a slot the studio released is free,
// so ending the block withdraws it like any other free slot instead of
// keeping it published, and bookable, past the block's end.
describe('a slot released from a paid evaluation', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => fixtureNow });
  const principal = (email: string) => world.principalOf(email);
  const slotAt = (startsAt: string) =>
    slotIdAt(world.prisma, mondayBlockId, startsAt);

  const releaseLuciaAt = async (startsAt: string) => {
    const booked = await commands().bookPaidEvaluation(
      await slotAt(startsAt),
      await principal('lucia@example.com'),
      randomUUID(),
    );
    await createPrismaPaymentCommands(world.prisma, {
      now: () => fixtureNow,
    }).confirmTransfer(
      { paymentId: booked.paymentId! },
      await principal('paola.mendoza@example.com'),
    );
    await commands().cancelEvaluationAsStaff(
      booked.id,
      await principal('carla@example.com'),
    );
    return booked.id;
  };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, commands()));
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('is withdrawn when the block ends, while booked slots are kept', async () => {
    const releasedId = await releaseLuciaAt('2026-09-28T13:45:00.000Z');
    const releasedSlot = await slotAt('2026-09-28T13:45:00.000Z');
    await commands().bookEvaluation(
      await slotAt('2026-09-28T14:30:00.000Z'),
      await principal('ana@example.com'),
      randomUUID(),
    );

    const ended = await commands().endAvailabilityBlock(
      { blockId: mondayBlockId, effectiveFrom: civil('2026-09-28') },
      await principal('carla@example.com'),
    );

    expect(ended.keptEvaluations).toBe(1);
    await expect(
      world.prisma.evaluationSlot.findUniqueOrThrow({
        where: { id: releasedSlot },
        select: { state: true },
      }),
    ).resolves.toEqual({ state: 'WITHDRAWN' });
    // Her Evaluation still waits for another slot, with its Payment.
    const evaluation = await world.prisma.evaluation.findUniqueOrThrow({
      where: { id: releasedId },
      select: { state: true, slotReleasedAt: true },
    });
    expect(evaluation.state).toBe('BOOKED');
    expect(evaluation.slotReleasedAt).not.toBeNull();
  });
});
