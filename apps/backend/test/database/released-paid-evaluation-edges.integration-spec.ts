import { randomUUID } from 'node:crypto';
import { closureScope } from '../../src/booking/account-closure/closure-scope';
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

// FIX-056 (walkthrough findings 67 and 72, review of the branch): the agenda
// tells the Nutritionist which Evaluations are paid, so the cancel sheet can
// say the payment stays; a released Evaluation no longer holds its slot
// when the block ends, and Account closure still finds it after its old time.
describe('the edges of a released paid evaluation', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;
  let releasedId: string;
  let releasedSlotId: string;
  const commands = (now: Date = fixtureNow) =>
    createPrismaEvaluationCommands(world.prisma, { now: () => now });
  const principal = (email: string) => world.principalOf(email);

  const bookPaidAndConfirm = async (startsAt: string) => {
    const booked = await commands().bookPaidEvaluation(
      await slotIdAt(world.prisma, mondayBlockId, startsAt),
      await principal('lucia@example.com'),
      randomUUID(),
    );
    await createPrismaPaymentCommands(world.prisma, {
      now: () => fixtureNow,
    }).confirmTransfer(
      { paymentId: booked.paymentId! },
      await principal('paola.mendoza@example.com'),
    );
    return booked;
  };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, commands()));
    releasedSlotId = await slotIdAt(
      world.prisma,
      mondayBlockId,
      '2026-09-28T13:00:00.000Z',
    );
    const released = await bookPaidAndConfirm('2026-09-28T13:00:00.000Z');
    await commands().cancelEvaluationAsStaff(
      released.id,
      await principal('carla@example.com'),
    );
    releasedId = released.id;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('tells the agenda which Evaluations have a confirmed payment', async () => {
    const paid = await bookPaidAndConfirm('2026-09-28T13:45:00.000Z');
    const included = await commands().bookEvaluation(
      await slotIdAt(world.prisma, mondayBlockId, '2026-09-28T14:30:00.000Z'),
      await principal('ana@example.com'),
      randomUUID(),
    );

    const agenda = await commands().listNutritionistAgenda(
      {},
      await principal('carla@example.com'),
    );

    const confirmed = Object.fromEntries(
      agenda.items.map((item) => [item.evaluationId, item.paymentConfirmed]),
    );
    expect(confirmed).toEqual({ [paid.id]: true, [included.id]: false });
  });

  it('lets Account closure find it after its old time', async () => {
    const lucia = await principal('lucia@example.com');
    const clientId =
      lucia.identity.kind === 'client' ? lucia.identity.clientId : '';

    const found = await world.prisma.evaluation.findMany({
      where: closureScope.upcomingEvaluations(
        clientId,
        new Date('2026-09-28T15:00:00.000Z'),
      ),
      select: { id: true },
    });

    expect(found.map((row) => row.id)).toContain(releasedId);
  });

  it('withdraws its old slot when the block ends', async () => {
    const ended = await commands().endAvailabilityBlock(
      { blockId: mondayBlockId, effectiveFrom: civil('2026-09-28') },
      await principal('carla@example.com'),
    );

    expect(ended.keptEvaluations).toBe(2);
    await expect(
      world.prisma.evaluationSlot.findUniqueOrThrow({
        where: { id: releasedSlotId },
        select: { state: true },
      }),
    ).resolves.toEqual({ state: 'WITHDRAWN' });
  });
});
