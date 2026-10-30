import {
  readPlanRenewals,
  renewalRateOf,
} from '../../src/booking/payments/plan-renewals';
import { monthFacts } from '../../src/back-office/finance/month-facts';
import { createPrismaFinance } from '../../src/back-office/finance/prisma-finance';
import { coordinatorMonthFacts } from '../../src/back-office/payroll/coordinator-pay-facts';
import { createPrismaPayStatements } from '../../src/back-office/payroll/prisma-pay-statements';
import { trainerMonthFacts } from '../../src/back-office/payroll/trainer-pay-facts';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import { readMonthKpis } from '../../src/studio/prisma-month-kpis';
import { recomputeStudioFacts } from '../../src/studio/prisma-studio-facts';
import {
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';
import { civil, payrollFixtures } from './payroll-finance-test-support';

// FIX-007 independent review: the Nutritionist's pay counted twice, a void
// that blocked a commission never paid, the KPI renewal denominator, stale
// drafts, and the «renovó» boundaries in La Paz.
describe('payroll and finance review fixes', () => {
  let world: EvaluationTestWorld;
  const emmaId = deterministicId('staff-member:emma');
  const gabrielaId = deterministicId('staff-member:gabriela');
  const carolinaId = deterministicId('staff-member:carolina');
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const { newClient, sell, voidSale, salary } = payrollFixtures(
    () => world,
    administrator,
  );

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('leaves the Nutritionist out of the salaries, since «Resultado» already counts her per consultation', async () => {
    await salary(gabrielaId, 50_000);
    await salary(carolinaId, 350_000);

    const result = await createPrismaFinance(world.prisma, {
      ofMonth: (from, until) => monthFacts(world.prisma, from, until),
    }).monthResult({ month: civil('2027-02-01') }, await administrator());

    expect(result.salariesCentavos).toBe(350_000);
  });

  it('pays the commission after a first sale voided in its own month, and never after one voided once paid', async () => {
    const fixed = await newClient('Anulada el mismo mes', emmaId);
    const wrong = await sell({
      clientId: fixed,
      decidedAt: new Date('2027-06-03T15:00:00.000Z'),
      startsOn: civil('2027-06-03'),
    });
    await voidSale(wrong.id, new Date('2027-06-04T15:00:00.000Z'));
    await sell({
      clientId: fixed,
      decidedAt: new Date('2027-07-03T15:00:00.000Z'),
      startsOn: civil('2027-07-03'),
    });
    const late = await newClient('Anulada después de pagada', emmaId);
    const paid = await sell({
      clientId: late,
      decidedAt: new Date('2027-06-06T15:00:00.000Z'),
      startsOn: civil('2027-06-06'),
    });
    await voidSale(paid.id, new Date('2027-07-02T15:00:00.000Z'));
    await sell({
      clientId: late,
      decidedAt: new Date('2027-07-05T15:00:00.000Z'),
      startsOn: civil('2027-07-05'),
    });

    const july = await trainerMonthFacts(
      world.prisma,
      civil('2027-07-01'),
      civil('2027-08-01'),
    );

    expect(
      july.trainers.find((trainer) => trainer.staffMemberId === emmaId)
        ?.firstPlanPaymentsCentavos,
    ).toEqual([59_000]);
  });

  it('measures «renovó» on the Bolivia date, the seventh day in and the eighth out', async () => {
    const seventh = await newClient('Compra el séptimo día a las 23:00');
    await sell({
      clientId: seventh,
      decidedAt: new Date('2027-09-11T15:00:00.000Z'),
      startsOn: civil('2027-09-11'),
    });
    // Ends 10 October; 23:00 on 17 October in La Paz is 18 October in UTC.
    await sell({
      clientId: seventh,
      decidedAt: new Date('2027-10-18T03:00:00.000Z'),
      startsOn: civil('2027-10-18'),
    });
    const eighth = await newClient('Compra el octavo día');
    await sell({
      clientId: eighth,
      decidedAt: new Date('2027-09-13T15:00:00.000Z'),
      startsOn: civil('2027-09-13'),
    });
    // Ends 12 October; bought on 20 October.
    await sell({
      clientId: eighth,
      decidedAt: new Date('2027-10-20T15:00:00.000Z'),
      startsOn: civil('2027-10-20'),
    });

    const renewals = await readPlanRenewals(
      world.prisma,
      civil('2027-10-01'),
      civil('2027-11-01'),
    );

    expect(renewalRateOf(renewals)).toBe(50);
  });

  it('rates the KPI renewal over the Plans that ended, like the bonus', async () => {
    const renews = await newClient('KPI renueva');
    await sell({
      clientId: renews,
      decidedAt: new Date('2028-03-01T15:00:00.000Z'),
      startsOn: civil('2028-03-01'),
    });
    await sell({
      clientId: renews,
      decidedAt: new Date('2028-03-28T15:00:00.000Z'),
      startsOn: civil('2028-04-01'),
    });
    const leaves = await newClient('KPI no renueva');
    await sell({
      clientId: leaves,
      decidedAt: new Date('2028-02-28T15:00:00.000Z'),
      startsOn: civil('2028-02-28'),
    });
    // Two more Clients in force all March whose Plans do not end in it.
    for (const name of ['KPI activa uno', 'KPI activa dos']) {
      await sell({
        clientId: await newClient(name),
        decidedAt: new Date('2028-02-20T15:00:00.000Z'),
        startsOn: civil('2028-02-20'),
        durationDays: 60,
      });
    }
    const march = civil('2028-03-01');
    await recomputeStudioFacts(world.prisma, {
      month: march,
      now: () => new Date('2028-04-10T15:00:00.000Z'),
    });

    const kpis = await readMonthKpis(world.prisma, { month: march });

    expect(kpis.renewalPercent).toBe(50);
  });

  it('withdraws a draft whose lines are gone', async () => {
    const brought = await newClient('Comisión que se anula', emmaId);
    const sale = await sell({
      clientId: brought,
      decidedAt: new Date('2028-01-05T15:00:00.000Z'),
      startsOn: civil('2028-01-05'),
    });
    const january = civil('2028-01-01');
    const statements = createPrismaPayStatements(world.prisma, {
      now: () => new Date('2028-01-10T15:00:00.000Z'),
      factsOfMonth: (from, until) =>
        trainerMonthFacts(world.prisma, from, until),
      coordinatorFactsOfMonth: (from, until) =>
        coordinatorMonthFacts(world.prisma, from, until),
    });
    await statements.draftMonth(january);
    const live = () =>
      world.prisma.payStatement.count({
        where: { staffMemberId: emmaId, month: january, deletedAt: null },
      });
    await expect(live()).resolves.toBe(1);

    await voidSale(sale.id, new Date('2028-01-06T15:00:00.000Z'));
    await statements.draftMonth(january);

    await expect(live()).resolves.toBe(0);
  });
});
