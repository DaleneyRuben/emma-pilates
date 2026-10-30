import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import {
  EvaluationState,
  PaymentState,
} from '../../src/generated/prisma/client';
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

// Owner decision 2026-10-29: a confirmed Paid Evaluation is rescheduled, not
// cancelled. Nothing is refunded. The Payment stays with the Evaluation.
describe('a confirmed paid evaluation', () => {
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

  const clientOf = (email: string) => world.principalOf(email);

  const bookAndConfirm = async (email: string, startsAt: string) => {
    const principal = await clientOf(email);
    const slotId = await slotIdAt(world.prisma, mondayBlockId, startsAt);
    const booked = await commands().bookPaidEvaluation(
      slotId,
      principal,
      randomUUID(),
    );
    const administrator = await world.principalOf('paola.mendoza@example.com');
    await createPrismaPaymentCommands(world.prisma, {
      now: () => fixtureNow,
    }).confirmTransfer({ paymentId: booked.paymentId! }, administrator);
    return booked;
  };

  it('refuses a client cancellation with evaluation_paid_not_cancellable', async () => {
    const booked = await bookAndConfirm(
      'lucia@example.com',
      '2026-09-28T13:00:00.000Z',
    );

    await expect(
      codeOf(
        commands().cancelClientEvaluation(
          booked.id,
          await clientOf('lucia@example.com'),
        ),
      ),
    ).resolves.toBe('evaluation_paid_not_cancellable');
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: booked.id },
        select: { state: true, payment: { select: { state: true } } },
      }),
    ).resolves.toEqual({
      state: EvaluationState.BOOKED,
      payment: { state: PaymentState.CONFIRMED },
    });
  });

  it('moves the evaluation to another slot and keeps the payment', async () => {
    const booked = await bookAndConfirm(
      'lucia@example.com',
      '2026-09-28T13:45:00.000Z',
    );
    const next = await slotIdAt(
      world.prisma,
      mondayBlockId,
      '2026-09-28T14:30:00.000Z',
    );
    const paymentId = booked.paymentId;

    const moved = await commands().rescheduleClientEvaluation(
      booked.id,
      next,
      await clientOf('lucia@example.com'),
      randomUUID(),
    );

    expect(moved.slotId).toBe(next);
    expect(moved.paymentId).toBe(paymentId);
    const row = await world.prisma.evaluation.findUniqueOrThrow({
      where: { id: booked.id },
      select: {
        evaluationSlotId: true,
        paymentId: true,
        payment: { select: { state: true } },
      },
    });
    expect(row).toEqual({
      evaluationSlotId: next,
      paymentId,
      payment: { state: PaymentState.CONFIRMED },
    });
    await expect(
      world.prisma.auditRecord.count({
        where: { targetId: booked.id, actionCode: 'evaluation.rescheduled' },
      }),
    ).resolves.toBe(1);
  });

  it('gives one new slot to the first of two clients', async () => {
    const plan = await world.prisma.plan.findFirstOrThrow({
      where: { durationDays: 30, hiddenAt: null },
      select: { id: true, name: true, classAllowance: true },
    });
    await world.prisma.client.create({
      data: {
        name: 'Renata Paz',
        referralCode: 'REF-RENATA-RACE',
        account: {
          create: {
            email: 'renata@example.com',
            activatedAt: fixtureNow,
            emailVerifiedAt: fixtureNow,
          },
        },
        subscriptions: {
          create: {
            planId: plan.id,
            planNameSnapshot: plan.name,
            durationDaysSnapshot: 30,
            originalClassAllowance: plan.classAllowance,
            remainingClassAllowance: 5,
            startsOn: new Date('2026-09-11T00:00:00.000Z'),
            endsOn: new Date('2026-10-20T00:00:00.000Z'),
            activatedAt: fixtureNow,
          },
        },
      },
    });
    const first = await bookAndConfirm(
      'lucia@example.com',
      '2026-10-05T13:00:00.000Z',
    );
    const other = await clientOf('renata@example.com');
    const otherSlot = await slotIdAt(
      world.prisma,
      mondayBlockId,
      '2026-10-05T13:45:00.000Z',
    );
    const otherBooked = await commands().bookPaidEvaluation(
      otherSlot,
      other,
      randomUUID(),
    );
    await createPrismaPaymentCommands(world.prisma, {
      now: () => fixtureNow,
    }).confirmTransfer(
      { paymentId: otherBooked.paymentId! },
      await world.principalOf('paola.mendoza@example.com'),
    );
    const contested = await slotIdAt(
      world.prisma,
      mondayBlockId,
      '2026-10-05T14:30:00.000Z',
    );

    const results = await Promise.allSettled([
      commands().rescheduleClientEvaluation(
        first.id,
        contested,
        await clientOf('lucia@example.com'),
        randomUUID(),
      ),
      commands().rescheduleClientEvaluation(
        otherBooked.id,
        contested,
        await clientOf('renata@example.com'),
        randomUUID(),
      ),
    ]);

    const won = results.filter((result) => result.status === 'fulfilled');
    expect(won).toHaveLength(1);
    await expect(
      world.prisma.evaluation.count({
        where: {
          evaluationSlotId: contested,
          state: EvaluationState.BOOKED,
        },
      }),
    ).resolves.toBe(1);
  });

  it('keeps a nutritionist cancellation payable and tells the client to pick another slot', async () => {
    const booked = await bookAndConfirm(
      'lucia@example.com',
      '2026-10-05T15:15:00.000Z',
    );
    const nutritionist = await world.principalOf('carla@example.com');

    await commands().cancelEvaluationAsStaff(booked.id, nutritionist);

    const row = await world.prisma.evaluation.findUniqueOrThrow({
      where: { id: booked.id },
      select: { state: true, payment: { select: { state: true } } },
    });
    expect(row.state).toBe(EvaluationState.BOOKED);
    expect(row.payment?.state).toBe(PaymentState.CONFIRMED);
    const lucia = await clientOf('lucia@example.com');
    const clientId =
      lucia.identity.kind === 'client' ? lucia.identity.clientId : '';
    const account = await world.prisma.client.findUniqueOrThrow({
      where: { id: clientId },
      select: { account: { select: { id: true } } },
    });
    await expect(
      world.prisma.notification.count({
        where: {
          accountId: account.account?.id,
          type: 'evaluation_reschedule_required',
        },
      }),
    ).resolves.toBe(1);
  });
});
