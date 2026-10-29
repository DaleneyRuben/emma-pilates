import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { PaymentState } from '../../src/generated/prisma/client';
import {
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  codeOf,
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

// A second paid Evaluation while the first transfer is still pending is a
// conflict, not a unique-constraint 500.
describe('a second paid evaluation while one payment is pending', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;
  const commands = () =>
    createPrismaEvaluationCommands(world.prisma, { now: () => fixtureNow });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, commands()));
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('answers evaluation_payment_pending', async () => {
    const lucia = await world.principalOf('lucia@example.com');
    const first = await slotIdAt(
      world.prisma,
      mondayBlockId,
      '2026-09-28T13:00:00.000Z',
    );
    const second = await slotIdAt(
      world.prisma,
      mondayBlockId,
      '2026-09-28T13:45:00.000Z',
    );
    const booked = await commands().bookPaidEvaluation(
      first,
      lucia,
      randomUUID(),
    );
    expect(booked.paymentId).not.toBeNull();

    await expect(
      codeOf(commands().bookPaidEvaluation(second, lucia, randomUUID())),
    ).resolves.toBe('evaluation_payment_pending');
    await expect(
      world.prisma.payment.count({
        where: {
          clientId:
            lucia.identity.kind === 'client' ? lucia.identity.clientId : '',
          state: PaymentState.PENDING,
        },
      }),
    ).resolves.toBe(1);
  });
});
