import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import {
  bookIsabelFutureSession,
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  codeOf,
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

// FIX-062: a released Evaluation waits for a new slot. Another Client can
// book its old slot (owner approval of the index swap, 2026-11-17), a second
// booking of that slot answers a problem code instead of a 500, it cannot be
// marked a no-show, and releasing it again repeats nothing.
describe('guards around a released paid evaluation', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;
  let releasedId: string;
  const releasedAt = '2026-09-28T13:00:00.000Z';
  const commands = (now: Date = fixtureNow) =>
    createPrismaEvaluationCommands(world.prisma, { now: () => now });
  const principal = (email: string) => world.principalOf(email);
  const slotAt = (startsAt: string) =>
    slotIdAt(world.prisma, mondayBlockId, startsAt);

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, commands()));
    await bookIsabelFutureSession(world);
    const booked = await commands().bookPaidEvaluation(
      await slotAt(releasedAt),
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
    releasedId = booked.id;
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lets another Client book the old slot, which then holds one Evaluation', async () => {
    const booked = await commands().bookEvaluation(
      await slotAt(releasedAt),
      await principal('ana@example.com'),
      randomUUID(),
    );
    expect(booked.state).toBe('booked');

    await expect(
      codeOf(
        commands().bookPaidEvaluation(
          await slotAt(releasedAt),
          await principal('isabel@example.com'),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('evaluation_slot_unavailable');
  });

  it('refuses to mark it a no-show after its old time', async () => {
    await expect(
      codeOf(
        commands(new Date('2026-09-28T14:00:00.000Z')).recordEvaluationNoShow(
          releasedId,
          await principal('carla@example.com'),
        ),
      ),
    ).resolves.toBe('evaluation_not_booked');
  });

  it('repeats nothing when the studio releases it again', async () => {
    await commands().cancelEvaluationAsStaff(
      releasedId,
      await principal('carla@example.com'),
    );

    await expect(
      world.prisma.notification.count({
        where: { type: 'evaluation_reschedule_required' },
      }),
    ).resolves.toBe(1);
    await expect(
      world.prisma.auditRecord.count({
        where: { targetId: releasedId, actionCode: 'evaluation.slot_released' },
      }),
    ).resolves.toBe(1);
  });
});
