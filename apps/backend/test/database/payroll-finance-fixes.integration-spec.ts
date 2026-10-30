import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { monthFacts } from '../../src/back-office/finance/month-facts';
import { createPrismaFinance } from '../../src/back-office/finance/prisma-finance';
import { coordinatorMonthFacts } from '../../src/back-office/payroll/coordinator-pay-facts';
import { createPrismaPayStatements } from '../../src/back-office/payroll/prisma-pay-statements';
import { trainerMonthFacts } from '../../src/back-office/payroll/trainer-pay-facts';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import { civil, payrollFixtures } from './payroll-finance-test-support';
import {
  fixtureNow,
  startEvaluationTestWorld,
  type EvaluationTestWorld,
} from './evaluation-test-support';

const february = civil('2027-02-01');
const march = civil('2027-03-01');
const april = civil('2027-04-01');

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof BackOfficeError) return error.code;
    return String(error);
  }
};

// FIX-007: the review's payroll and finance findings (H10, H11, H18, owner
// decision 5, and the medium ones on months, approvals, commissions, the
// Coordinator, re-drafts, the budget seed, and the settings in force).
describe('payroll and finance fixes', () => {
  let world: EvaluationTestWorld;
  const emmaId = deterministicId('staff-member:emma');
  const carolinaId = deterministicId('staff-member:carolina');
  const camilaId = deterministicId('staff-member:camila');

  const finance = () =>
    createPrismaFinance(world.prisma, {
      ofMonth: (from, until) => monthFacts(world.prisma, from, until),
    });
  const statements = (now: Date) =>
    createPrismaPayStatements(world.prisma, {
      now: () => now,
      factsOfMonth: (from, until) =>
        trainerMonthFacts(world.prisma, from, until),
      coordinatorFactsOfMonth: (from, until) =>
        coordinatorMonthFacts(world.prisma, from, until),
    });
  const administrator = () => world.principalOf('paola.mendoza@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const { newClient, sell, voidSale, salary, nextSettingsVersion } =
    payrollFixtures(() => world, administrator);

  it('seeds the opening budget once, even when two seeds race', async () => {
    const admin = await administrator();
    await Promise.allSettled([
      finance().seedOpeningBudget(admin),
      finance().seedOpeningBudget(admin),
    ]);
    await expect(world.prisma.costBudgetLine.count()).resolves.toBe(10);
  });

  it('subtracts the month’s salaries and maps the Coordinadora and Recepción lines to theirs (H10)', async () => {
    await salary(carolinaId, 350_000);
    await salary(camilaId, 340_000);
    await salary(emmaId, 120_000);

    const result = await finance().monthResult(
      { month: february },
      await administrator(),
    );

    const line = (name: string) =>
      result.lines.find((entry) => entry.name === name)?.actualCentavos;
    expect(line('Coordinadora')).toBe(350_000);
    expect(line('Recepción')).toBe(340_000);
    expect(result.salariesCentavos).toBe(810_000);
    expect(result.resultCentavos).toBe(
      result.cashIncomeCentavos -
        result.taxCentavos -
        810_000 -
        result.nutritionistCostCentavos,
    );
  });

  it('cuts the month in Bolivia time and reads the tax in force for it', async () => {
    const client = await newClient('Compra a las 23:30');
    // 23:30 on 28 February in La Paz is already 1 March in UTC.
    await sell({
      clientId: client,
      decidedAt: new Date('2027-03-01T03:30:00.000Z'),
      startsOn: civil('2027-02-28'),
      // Ends in May, out of the March renewal rate below.
      durationDays: 90,
    });
    const current = await nextSettingsVersion({
      taxRatePercent: 25,
      createdAt: new Date('2027-03-05T12:00:00.000Z'),
    });

    const result = await finance().monthResult(
      { month: february },
      await administrator(),
    );

    expect(result.cashIncomeCentavos).toBe(59_000);
    expect(result.taxRatePercent).toBe(current.taxRatePercent);
  });

  it('measures «renovó» by purchase date over real Plans only (H18, decision 5)', async () => {
    const renewsEarly = await newClient('Renueva antes, empieza tarde');
    await sell({
      clientId: renewsEarly,
      decidedAt: new Date('2027-02-09T15:00:00.000Z'),
      startsOn: civil('2027-02-09'),
      durationDays: 30,
    });
    // Her Plan ends on 10 March. She buys on 15 March, within 7 days, and
    // starts on 20 April.
    await sell({
      clientId: renewsEarly,
      decidedAt: new Date('2027-03-15T15:00:00.000Z'),
      startsOn: civil('2027-04-20'),
    });
    const renewsLate = await newClient('Renueva tarde');
    await sell({
      clientId: renewsLate,
      decidedAt: new Date('2027-02-11T15:00:00.000Z'),
      startsOn: civil('2027-02-11'),
      durationDays: 30,
    });
    await sell({
      clientId: renewsLate,
      decidedAt: new Date('2027-03-25T15:00:00.000Z'),
      startsOn: civil('2027-03-26'),
    });
    const guest = await newClient('Pase de invitada');
    await sell({
      clientId: guest,
      decidedAt: new Date('2027-02-19T15:00:00.000Z'),
      startsOn: civil('2027-02-19'),
      durationDays: 30,
      method: 'COURTESY',
      priceCentavos: 0,
    });

    const facts = await coordinatorMonthFacts(world.prisma, march, april);

    expect(facts.renewalRatePercent).toBe(50);
  });

  it('pays one statement per active Coordinator and none to a deactivated one', async () => {
    const admin = await administrator();
    const second = await world.prisma.staffMember.create({
      data: {
        name: 'Segunda coordinadora',
        role: 'COORDINATOR',
        account: {
          create: {
            email: `${randomUUID()}@example.com`,
            activatedAt: fixtureNow,
          },
        },
      },
      select: { id: true },
    });
    const gone = await world.prisma.staffMember.create({
      data: {
        name: 'Coordinadora desactivada',
        role: 'COORDINATOR',
        createdAt: civil('2020-01-01'),
        account: {
          create: {
            email: `${randomUUID()}@example.com`,
            activatedAt: fixtureNow,
            disabledAt: fixtureNow,
          },
        },
      },
      select: { id: true },
    });

    await statements(new Date('2027-04-09T12:00:00.000Z')).draftMonth(march);

    const coordinators = await world.prisma.payStatement.findMany({
      where: {
        month: march,
        deletedAt: null,
        staffMemberId: { in: [carolinaId, second.id, gone.id] },
      },
      select: { staffMemberId: true },
    });
    expect(coordinators.map((row) => row.staffMemberId).sort()).toEqual(
      [carolinaId, second.id].sort(),
    );
    expect(admin.accountId).toBeDefined();
  });

  it('opens no second commission after a voided first Plan, and none on a single class', async () => {
    const voided = await newClient('Primera anulada', emmaId);
    const first = await sell({
      clientId: voided,
      decidedAt: new Date('2027-03-03T15:00:00.000Z'),
      startsOn: civil('2027-03-03'),
    });
    // Voided after March was over, so its commission may have been paid.
    await voidSale(first.id, new Date('2027-04-02T15:00:00.000Z'));
    await sell({
      clientId: voided,
      decidedAt: new Date('2027-04-03T15:00:00.000Z'),
      startsOn: civil('2027-04-03'),
    });
    const single = await newClient('Clase suelta primero', emmaId);
    await sell({
      clientId: single,
      decidedAt: new Date('2027-03-05T15:00:00.000Z'),
      startsOn: civil('2027-03-05'),
      classAllowance: 1,
      priceCentavos: 8_000,
    });
    await sell({
      clientId: single,
      decidedAt: new Date('2027-04-05T15:00:00.000Z'),
      startsOn: civil('2027-04-05'),
      priceCentavos: 59_000,
    });

    const inMarch = await trainerMonthFacts(world.prisma, march, april);
    const inApril = await trainerMonthFacts(
      world.prisma,
      april,
      civil('2027-05-01'),
    );
    const commissions = (facts: typeof inMarch) =>
      facts.trainers.find((trainer) => trainer.staffMemberId === emmaId)
        ?.firstPlanPaymentsCentavos ?? [];
    expect(commissions(inMarch)).toEqual([]);
    expect(commissions(inApril)).toEqual([59_000]);
  });

  it('refuses an approval before the month is over, the Coordinator’s 7 days included', async () => {
    const admin = await administrator();
    await statements(new Date('2027-04-09T12:00:00.000Z')).draftMonth(march);
    const listed = await statements(fixtureNow).listStatements(
      { month: march },
      admin,
    );
    const coordinator = listed.find((row) => row.staffMemberId === carolinaId)!;

    await expect(
      codeOf(
        statements(new Date('2027-03-20T12:00:00.000Z')).approveStatement(
          { statementId: coordinator.id },
          admin,
        ),
      ),
    ).resolves.toBe('pay_statement_month_open');
    // 3 April in La Paz: March is over, the renewal week is not.
    await expect(
      codeOf(
        statements(new Date('2027-04-03T12:00:00.000Z')).approveStatement(
          { statementId: coordinator.id },
          admin,
        ),
      ),
    ).resolves.toBe('pay_statement_month_open');
  });

  it('pays once when two approvals race, and a re-draft leaves an approved statement alone (H11)', async () => {
    const admin = await administrator();
    const after = new Date('2027-04-09T12:00:00.000Z');
    await statements(after).draftMonth(march);
    const listed = await statements(after).listStatements(
      { month: march },
      admin,
    );
    const target = listed.find((row) => row.staffMemberId === carolinaId)!;

    await Promise.allSettled([
      statements(after).approveStatement({ statementId: target.id }, admin),
      statements(after).approveStatement({ statementId: target.id }, admin),
      statements(after).draftMonth(march),
    ]);

    await expect(
      world.prisma.salaryPayment.count({
        where: { staffMemberId: carolinaId, paidOn: civil('2027-04-09') },
      }),
    ).resolves.toBe(1);
    await expect(
      world.prisma.payStatement.findMany({
        where: { staffMemberId: carolinaId, month: march, deletedAt: null },
        select: { state: true },
      }),
    ).resolves.toEqual([{ state: 'APPROVED' }]);
  });

  it('re-drafts only when the lines change', async () => {
    const at = new Date('2027-05-02T12:00:00.000Z');
    await statements(at).draftMonth(april);
    const before = await world.prisma.payStatement.findMany({
      where: { month: april, deletedAt: null },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    await statements(new Date(at.getTime() + 60 * 60 * 1_000)).draftMonth(
      april,
    );

    const after = await world.prisma.payStatement.findMany({
      where: { month: april, deletedAt: null },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    expect(after).toEqual(before);
    await expect(
      world.prisma.payStatement.count({
        where: { month: april, deletedAt: { not: null } },
      }),
    ).resolves.toBe(0);
  });
});
