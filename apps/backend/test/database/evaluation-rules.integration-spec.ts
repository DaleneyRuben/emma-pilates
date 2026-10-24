import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
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

// NUT-003, booking ADR-0011. The fixture clock is Monday 2026-09-21 11:00
// in Bolivia. Lucía holds a 30-day Plan; Ana and Bea hold one that covers
// September through November.
describe('nutritionist evaluation rules', () => {
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

  const slot = (startsAt: string) =>
    slotIdAt(world.prisma, mondayBlockId, startsAt);

  it('books a quarterly Client free once and offers the second at the settings price', async () => {
    const ana = await world.principalOf('ana@example.com');
    const first = await commands().bookEvaluation(
      await slot('2026-09-28T13:00:00.000Z'),
      ana,
      randomUUID(),
    );

    expect(first).toMatchObject({ included: true, priceCentavos: 0 });
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: first.id },
        select: { nutritionistCostCentavos: true, paymentId: true },
      }),
    ).resolves.toEqual({ nutritionistCostCentavos: 5_000, paymentId: null });
    await expect(
      codeOf(
        commands().bookEvaluation(
          await slot('2026-10-05T13:00:00.000Z'),
          ana,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('evaluation_payment_required');
  });

  it('offers an 8-class Client the settings price and never a Founder discount', async () => {
    const lucia = await world.principalOf('lucia@example.com');
    const preview = await commands().readEvaluationSlot(
      await slot('2026-09-28T13:45:00.000Z'),
      lucia,
    );

    expect(preview).toMatchObject({
      bookable: true,
      included: false,
      priceCentavos: 7_000,
    });
  });

  it('refuses a Client with no active Plan', async () => {
    await expect(
      codeOf(
        commands().bookEvaluation(
          await slot('2026-09-28T14:30:00.000Z'),
          await world.principalOf('mariana@example.com'),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('no_eligible_subscription');
  });

  it('records Bs 150 for three held Evaluations in a month', async () => {
    await commands().bookEvaluation(
      await slot('2026-09-28T13:45:00.000Z'),
      await world.principalOf('bea@example.com'),
      randomUUID(),
    );
    const client = await world.prisma.client.create({
      data: {
        name: 'Clara Rojas',
        referralCode: 'REF-CLARA-NUT',
        account: {
          create: {
            email: 'clara@example.com',
            activatedAt: fixtureNow,
            emailVerifiedAt: fixtureNow,
          },
        },
        subscriptions: {
          create: {
            planId: deterministicId('plan:trimestral-36'),
            planNameSnapshot: 'Trimestral 36 clases',
            durationDaysSnapshot: 90,
            originalClassAllowance: 36,
            remainingClassAllowance: 36,
            startsOn: new Date('2026-09-01T00:00:00.000Z'),
            endsOn: new Date('2026-11-30T00:00:00.000Z'),
            activatedAt: fixtureNow,
          },
        },
      },
      select: { account: { select: { email: true } } },
    });
    await commands().bookEvaluation(
      await slot('2026-09-28T14:30:00.000Z'),
      await world.principalOf(client.account!.email),
      randomUUID(),
    );
    const total = await world.prisma.evaluation.aggregate({
      where: {
        nutritionistCostCentavos: { not: null },
        slot: { localMonth: new Date('2026-09-01T00:00:00.000Z') },
      },
      _sum: { nutritionistCostCentavos: true },
    });

    expect(total._sum.nutritionistCostCentavos).toBe(15_000);
  });

  it('takes an 8-class Client through the QR hold and records Evaluation income', async () => {
    const lucia = await world.principalOf('lucia@example.com');
    const slotId = await slot('2026-10-05T13:45:00.000Z');
    const started = await commands().bookPaidEvaluation(
      slotId,
      lucia,
      randomUUID(),
    );

    expect(started).toMatchObject({
      included: false,
      priceCentavos: 7_000,
      state: 'booked',
    });
    const held = await world.prisma.evaluation.findUniqueOrThrow({
      where: { id: started.id },
      select: {
        paymentId: true,
        subscriptionId: true,
        nutritionistCostCentavos: true,
        payment: {
          select: { kind: true, state: true, amountDueCentavos: true },
        },
      },
    });
    expect(held.subscriptionId).toBeNull();
    expect(held.nutritionistCostCentavos).toBeNull();
    expect(held.payment).toEqual({
      kind: 'EVALUATION',
      state: 'PENDING',
      amountDueCentavos: 7_000,
    });

    const clock = { now: fixtureNow };
    const later = createPrismaEvaluationCommands(world.prisma, {
      now: () => clock.now,
    });
    clock.now = new Date(fixtureNow.getTime() + 24 * 60 * 60 * 1_000);
    await expect(later.releaseExpiredEvaluationHolds()).resolves.toBe(1);
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: started.id },
        select: {
          state: true,
          cancellationCause: true,
          payment: { select: { state: true } },
        },
      }),
    ).resolves.toEqual({
      state: 'CANCELLED',
      cancellationCause: 'PAYMENT_EXPIRED',
      payment: { state: 'REJECTED' },
    });
    await expect(
      later.readEvaluationSlot(slotId, lucia),
    ).resolves.toMatchObject({ bookable: true, priceCentavos: 7_000 });

    const again = await later.bookPaidEvaluation(slotId, lucia, randomUUID());
    await later.confirmEvaluationTransfer(
      again.paymentId,
      await world.principalOf('paola.mendoza@example.com'),
    );
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: again.id },
        select: {
          nutritionistCostCentavos: true,
          subscriptionId: true,
          payment: {
            select: { state: true, subscription: { select: { id: true } } },
          },
        },
      }),
    ).resolves.toMatchObject({
      nutritionistCostCentavos: 5_000,
      subscriptionId: null,
      payment: { state: 'CONFIRMED', subscription: null },
    });

    const report = await createPrismaOversight(world.prisma, {
      now: () => fixtureNow,
    }).incomeReport(
      {
        from: new Date('2026-08-01T04:00:00.000Z'),
        until: new Date('2026-10-01T04:00:00.000Z'),
      },
      await world.principalOf('paola.mendoza@example.com'),
    );
    expect(report.byKind.evaluation).toBe(7_000);
    expect(report.byKind.plan).toBeGreaterThan(0);
  });

  it('counts a late cancellation and a no-show as used and refunds nothing', async () => {
    const client = await world.prisma.client.create({
      data: {
        name: 'Dora Peña',
        referralCode: 'REF-DORA-NUT',
        account: {
          create: {
            email: 'dora@example.com',
            activatedAt: fixtureNow,
            emailVerifiedAt: fixtureNow,
          },
        },
        subscriptions: {
          create: {
            planId: deterministicId('plan:trimestral-36'),
            planNameSnapshot: 'Trimestral 36 clases',
            durationDaysSnapshot: 90,
            originalClassAllowance: 36,
            remainingClassAllowance: 36,
            startsOn: new Date('2026-09-01T00:00:00.000Z'),
            endsOn: new Date('2026-11-30T00:00:00.000Z'),
            activatedAt: fixtureNow,
          },
        },
      },
      select: { account: { select: { email: true } } },
    });
    const dora = await world.principalOf(client.account!.email);
    const clock = { now: fixtureNow };
    const timed = createPrismaEvaluationCommands(world.prisma, {
      now: () => clock.now,
    });
    const evaluation = await timed.bookEvaluation(
      await slot('2026-10-12T13:00:00.000Z'),
      dora,
      randomUUID(),
    );
    clock.now = new Date('2026-10-12T11:00:00.000Z');
    await expect(
      codeOf(timed.cancelClientEvaluation(evaluation.id, dora)),
    ).resolves.toBe('evaluation_cancellation_window_closed');
    await expect(
      codeOf(
        timed.bookEvaluation(
          await slot('2026-10-19T13:00:00.000Z'),
          dora,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('evaluation_payment_required');
    clock.now = new Date('2026-10-12T13:00:00.000Z');
    await timed.recordEvaluationNoShow(
      evaluation.id,
      await world.principalOf('carla@example.com'),
    );
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: evaluation.id },
        select: {
          state: true,
          nutritionistCostCentavos: true,
          paymentId: true,
        },
      }),
    ).resolves.toEqual({
      state: 'NO_SHOW',
      nutritionistCostCentavos: 5_000,
      paymentId: null,
    });
  });

  it('shows Evaluation income apart from Plan income', async () => {
    const report = await createPrismaOversight(world.prisma, {
      now: () => fixtureNow,
    }).incomeReport(
      {
        from: new Date('2026-08-01T04:00:00.000Z'),
        until: new Date('2026-10-01T04:00:00.000Z'),
      },
      await world.principalOf('paola.mendoza@example.com'),
    );

    expect(report.byKind.plan).toBeGreaterThan(0);
    expect(report.byKind.evaluation).toBeGreaterThanOrEqual(0);
    expect(report.byKind.plan + report.byKind.evaluation).toBe(
      report.totalCentavos,
    );
  });
});
