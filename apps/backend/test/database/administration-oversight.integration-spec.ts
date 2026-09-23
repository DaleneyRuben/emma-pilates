import { AdministrationError } from '../../src/booking/administration/administration-errors';
import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof AdministrationError) return error.code;
    return String(error);
  }
};

describe('Prisma administration oversight reads', () => {
  let world: EvaluationTestWorld;
  const oversight = () =>
    createPrismaOversight(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();

    const ana = await world.prisma.client.findUniqueOrThrow({
      where: { id: deterministicId('test-client:ana') },
      select: {
        id: true,
        subscriptions: { select: { id: true } },
        account: { select: { id: true } },
      },
    });
    const slot = await world.prisma.evaluationSlot.findFirstOrThrow({
      where: { state: 'PUBLISHED', startsAt: { gt: fixtureNow } },
      orderBy: { startsAt: 'asc' },
    });
    await world.prisma.evaluation.create({
      data: {
        clientId: ana.id,
        evaluationSlotId: slot.id,
        eligibilityMonth: new Date('2026-09-01T00:00:00.000Z'),
        subscriptionId: ana.subscriptions[0].id,
        createdByAccountId: ana.account!.id,
      },
    });

    // A confirmed transfer, studio-wide income without a collection Branch.
    const plan = await world.prisma.plan.findFirstOrThrow();
    const paola = await administrator();
    await world.prisma.payment.create({
      data: {
        clientId: ana.id,
        planId: plan.id,
        planNameSnapshot: plan.name,
        durationMonthsSnapshot: plan.durationMonths,
        classAllowanceSnapshot: plan.classAllowance,
        planPriceCentavos: 50_000,
        creditAppliedCentavos: 0,
        amountDueCentavos: 50_000,
        method: 'TRANSFER',
        state: 'CONFIRMED',
        submittedByAccountId: ana.account!.id,
        submittedAt: new Date('2026-09-10T15:00:00.000Z'),
        decidedByAccountId: paola.accountId,
        decidedAt: new Date('2026-09-10T16:00:00.000Z'),
      },
    });
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('lists booked Evaluations in a date range and lets an Administrator cancel one', async () => {
    const page = await oversight().listEvaluations(
      {
        from: new Date('2026-09-21T04:00:00.000Z'),
        until: new Date('2026-10-21T04:00:00.000Z'),
        page: 1,
        pageSize: 20,
      },
      await administrator(),
    );

    expect(page.totalItems).toBe(1);
    expect(page.items[0]).toMatchObject({
      clientName: 'Ana Justiniano',
      nutritionistName: expect.any(String),
      branchName: expect.any(String),
    });
    await expect(
      codeOf(
        oversight().listEvaluations(
          { from: fixtureNow, until: fixtureNow, page: 1, pageSize: 20 },
          await world.principalOf('camila.rojas@example.com'),
        ),
      ),
    ).resolves.toBe('administration_access_denied');
  });

  it('lists Referrals searchable by either Client without accents', async () => {
    const all = await oversight().listReferrals(
      { page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(all.totalItems).toBe(2);
    expect(all.items[0]).toEqual(
      expect.objectContaining({
        referrerName: expect.any(String),
        referredName: expect.any(String),
        state: expect.stringMatching(/pending|awarded/),
      }),
    );
    const sofia = await oversight().listReferrals(
      { query: 'sofia', page: 1, pageSize: 20 },
      await administrator(),
    );
    expect(sofia.totalItems).toBe(2);
  });

  it('lists Clients with available Credit and the studio-wide total', async () => {
    const credits = await oversight().listCredits(
      { page: 1, pageSize: 20 },
      await administrator(),
    );

    expect(credits).toMatchObject({
      totalItems: 1,
      outstandingCentavos: 6_000,
      items: [
        expect.objectContaining({
          clientName: 'Sofía Guzmán',
          availableCentavos: 6_000,
          lastMovementAt: expect.any(Date),
        }),
      ],
    });
  });

  it('sums confirmed income by month and method, attributing only cash to a Branch', async () => {
    const range = {
      from: new Date('2026-08-01T04:00:00.000Z'),
      until: new Date('2026-10-01T04:00:00.000Z'),
    };
    const everywhere = await oversight().incomeReport(
      range,
      await administrator(),
    );
    const centro = await oversight().incomeReport(
      { ...range, branchId: deterministicId('branch:centro') },
      await administrator(),
    );

    expect(everywhere.byMethod.transfer).toBe(50_000);
    expect(everywhere.totalCentavos).toBe(everywhere.byMethod.cash + 50_000);
    expect(centro.byMethod).toEqual({
      cash: everywhere.byMethod.cash,
      transfer: 0,
      credit_only: 0,
    });
    expect(everywhere.months.map((month) => month.month)).toContain(
      '2026-09-01',
    );
  });
});
