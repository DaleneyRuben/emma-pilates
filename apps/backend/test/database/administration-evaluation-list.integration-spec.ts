import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  branchIdOf,
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

// WEB-008 (AW25): the Administrator's Evaluation list is scoped to the
// Branch the Evaluation happens at, and says whether each is the Client's
// first or a follow-up (NUT-001 D12), never storing it.
describe('Prisma administration Evaluation list for AW25', () => {
  let world: EvaluationTestWorld;
  const oversight = () =>
    createPrismaOversight(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const range = {
    from: new Date('2026-09-21T04:00:00.000Z'),
    until: new Date('2026-10-22T04:00:00.000Z'),
    page: 1,
    pageSize: 20,
  };

  const book = async (clientKey: 'ana' | 'bea', month: '09' | '10') => {
    const client = await world.prisma.client.findUniqueOrThrow({
      where: { id: deterministicId(`test-client:${clientKey}`) },
      select: {
        id: true,
        subscriptions: { select: { id: true }, orderBy: { startsOn: 'asc' } },
        account: { select: { id: true } },
      },
    });
    const slot = await world.prisma.evaluationSlot.findFirstOrThrow({
      where: {
        state: 'PUBLISHED',
        startsAt: {
          gt: fixtureNow,
          gte: new Date(`2026-${month}-01T04:00:00.000Z`),
        },
        evaluations: { none: {} },
      },
      orderBy: { startsAt: 'asc' },
    });
    // September takes the one included Evaluation. October is paid, so the
    // unique index still holds and the kind is derived from the earlier one.
    const paymentId =
      month === '10'
        ? (
            await world.prisma.payment.create({
              data: {
                clientId: client.id,
                planId: (await world.prisma.plan.findFirstOrThrow()).id,
                planNameSnapshot: 'Evaluación',
                durationDaysSnapshot: 0,
                classAllowanceSnapshot: 0,
                planPriceCentavos: 7_000,
                creditAppliedCentavos: 0,
                amountDueCentavos: 7_000,
                startsOn: new Date(`2026-${month}-01T00:00:00.000Z`),
                method: 'CASH',
                kind: 'EVALUATION',
                state: 'CONFIRMED',
                submittedByAccountId: client.account!.id,
                submittedAt: fixtureNow,
                decidedByAccountId: client.account!.id,
                decidedAt: fixtureNow,
              },
            })
          ).id
        : null;
    await world.prisma.evaluation.create({
      data: {
        clientId: client.id,
        evaluationSlotId: slot.id,
        eligibilityMonth: new Date(`2026-${month}-01T00:00:00.000Z`),
        subscriptionId: month === '09' ? client.subscriptions[0].id : null,
        paymentId,
        createdByAccountId: client.account!.id,
      },
    });
  };

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    await book('ana', '09');
    await book('ana', '10');
    await book('bea', '09');
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('keeps only the Evaluations held at the chosen Branch', async () => {
    const centro = await oversight().listEvaluations(
      { ...range, branchId: branchIdOf('centro') },
      await administrator(),
    );
    const equipetrol = await oversight().listEvaluations(
      { ...range, branchId: branchIdOf('equipetrol') },
      await administrator(),
    );

    expect(centro.totalItems).toBe(3);
    expect(
      centro.items.every((item) => item.branchId === branchIdOf('centro')),
    ).toBe(true);
    expect(equipetrol).toMatchObject({ totalItems: 0, items: [] });
  });

  it("derives each Evaluation's kind from the Client's earlier ones", async () => {
    const page = await oversight().listEvaluations(
      { ...range, branchId: branchIdOf('centro') },
      await administrator(),
    );

    expect(page.items.map((item) => [item.clientName, item.kind])).toEqual([
      ['Ana Justiniano', 'first'],
      ['Bea Montaño', 'first'],
      ['Ana Justiniano', 'follow_up'],
    ]);
  });
});
