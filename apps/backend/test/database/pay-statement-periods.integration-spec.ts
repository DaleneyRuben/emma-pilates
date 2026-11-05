import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { coordinatorMonthFacts } from '../../src/back-office/payroll/coordinator-pay-facts';
import { rethrowPeriodOverlap } from '../../src/back-office/payroll/pay-statement-drafts';
import { createPrismaPayStatements } from '../../src/back-office/payroll/prisma-pay-statements';
import { trainerMonthFacts } from '../../src/back-office/payroll/trainer-pay-facts';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import { civil } from './payroll-finance-test-support';
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
    if (error instanceof BackOfficeError) return error.code;
    return String(error);
  }
};

const period = (from: string, until: string) => ({
  from: civil(from),
  until: civil(until),
});

// BKO-009 (ADR-0109): a Trainer's Pay Statement covers a day, a week, a range
// or a month; two live statements of one Staff Member never overlap.
describe('pay statements for any period', () => {
  let world: EvaluationTestWorld;
  const emmaId = deterministicId('staff-member:emma');
  const danielaId = deterministicId('staff-member:daniela');
  const andreaId = deterministicId('staff-member:andrea');
  const carolinaId = deterministicId('staff-member:carolina');
  const branchId = deterministicId('branch:centro');
  const classTypeId = deterministicId('class-type:reformer');

  const statements = (now: Date = fixtureNow) =>
    createPrismaPayStatements(world.prisma, {
      now: () => now,
      factsOfMonth: (from, until) =>
        trainerMonthFacts(world.prisma, from, until),
      coordinatorFactsOfMonth: (from, until) =>
        coordinatorMonthFacts(world.prisma, from, until),
    });
  const administrator = () => world.principalOf('paola.mendoza@example.com');

  // A taught class of three (Bs 65) at 10:00 in La Paz on that civil date.
  const classOn = async (trainerId: string, date: string) => {
    await world.prisma.session.create({
      data: {
        id: randomUUID(),
        branchId,
        classTypeId,
        trainerStaffMemberId: trainerId,
        startsAt: new Date(`${date}T14:00:00.000Z`),
        endsAt: new Date(`${date}T15:00:00.000Z`),
        capacity: 8,
        state: 'SCHEDULED',
        minimumBookingsCheckCompletedAt: new Date(`${date}T11:00:00.000Z`),
        bookingsAtWindowClose: 3,
      },
    });
  };

  const liveOf = (staffMemberId: string) =>
    world.prisma.payStatement.findMany({
      where: { staffMemberId, deletedAt: null },
      orderBy: { periodStart: 'asc' },
      select: {
        periodStart: true,
        periodEnd: true,
        state: true,
        totalCentavos: true,
      },
    });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  describe('the database', () => {
    const insert = (staffMemberId: string, from: string, until: string) =>
      world.prisma.payStatement.create({
        data: {
          staffMemberId,
          month: civil(`${from.slice(0, 7)}-01`),
          periodStart: civil(from),
          periodEnd: civil(until),
          totalCentavos: 100,
        },
        select: { id: true },
      });

    it('refuses two overlapping live statements of one Staff Member', async () => {
      const month = await insert(danielaId, '2028-01-01', '2028-02-01');

      const overlap = await insert(danielaId, '2028-01-10', '2028-01-11').then(
        () => null,
        (error: unknown) => error,
      );
      expect(overlap).not.toBeNull();
      expect(overlapCode(overlap)).toBe('pay_statement_period_overlaps');

      // Another Staff Member, the next period, and a removed statement do not
      // block.
      await expect(
        insert(andreaId, '2028-01-10', '2028-01-11'),
      ).resolves.toBeDefined();
      await expect(
        insert(danielaId, '2028-02-01', '2028-02-08'),
      ).resolves.toBeDefined();
      await world.prisma.payStatement.update({
        where: { id: month.id },
        data: { deletedAt: fixtureNow },
      });
      await expect(
        insert(danielaId, '2028-01-10', '2028-01-11'),
      ).resolves.toBeDefined();
    });

    it('refuses a period that ends before it starts', async () => {
      await expect(
        insert(danielaId, '2028-03-10', '2028-03-10'),
      ).rejects.toThrow(/pay_statements_period_check/);
    });
  });

  it('drafts a Trainer’s day and approves it once the day is over in Bolivia', async () => {
    const admin = await administrator();
    await classOn(emmaId, '2027-06-07');
    await classOn(emmaId, '2027-06-14');
    const day = period('2027-06-07', '2027-06-08');

    await statements().draftPeriodAsAdministrator(day, admin);
    const listed = await statements().listStatements(day, admin);
    const emma = listed.find((row) => row.staffMemberId === emmaId)!;
    expect(emma).toMatchObject({
      periodStart: civil('2027-06-07'),
      periodEnd: civil('2027-06-08'),
      month: civil('2027-06-01'),
      state: 'draft',
      totalCentavos: 6_500,
    });

    // 19:00 on 7 June in La Paz: the day is still open.
    await expect(
      codeOf(
        statements(new Date('2027-06-07T23:00:00.000Z')).approveStatement(
          { statementId: emma.id },
          admin,
        ),
      ),
    ).resolves.toBe('pay_statement_month_open');
    const approved = await statements(
      new Date('2027-06-08T05:00:00.000Z'),
    ).approveStatement({ statementId: emma.id }, admin);
    expect(approved.state).toBe('approved');
  });

  it('skips a month that holds an approved day, for the worker and the Administrator', async () => {
    const admin = await administrator();
    await classOn(danielaId, '2027-06-09');
    const june = civil('2027-06-01');

    await expect(statements().draftMonth(june)).resolves.toBeDefined();
    await expect(
      statements().draftPeriodAsAdministrator(
        period('2027-06-01', '2027-07-01'),
        admin,
      ),
    ).resolves.toBeDefined();

    await expect(liveOf(emmaId)).resolves.toEqual([
      expect.objectContaining({
        periodStart: civil('2027-06-07'),
        state: 'APPROVED',
      }),
    ]);
    await expect(liveOf(danielaId)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          periodStart: june,
          periodEnd: civil('2027-07-01'),
          state: 'DRAFT',
        }),
      ]),
    );
  });

  it('lists the Coordinator only for a whole month, and every statement the window touches', async () => {
    const admin = await administrator();
    const monthly = await statements().listStatements(
      period('2027-06-01', '2027-07-01'),
      admin,
    );
    expect(monthly.map((row) => row.staffMemberId)).toEqual(
      expect.arrayContaining([carolinaId, danielaId, emmaId]),
    );

    const week = await statements().listStatements(
      period('2027-06-07', '2027-06-14'),
      admin,
    );
    expect(week.map((row) => row.staffMemberId)).not.toContain(carolinaId);
    expect(week.map((row) => row.staffMemberId)).toEqual(
      expect.arrayContaining([danielaId, emmaId]),
    );
  });

  it('replaces only drafts: a week replaces the month draft, and the worker then leaves the month alone', async () => {
    const admin = await administrator();
    const july = civil('2027-07-01');
    await classOn(emmaId, '2027-07-05');
    await classOn(emmaId, '2027-07-20');

    await statements().draftMonth(july);
    await expect(liveOf(emmaId)).resolves.toContainEqual(
      expect.objectContaining({ periodStart: july, totalCentavos: 13_000 }),
    );

    await statements().draftPeriodAsAdministrator(
      period('2027-07-05', '2027-07-12'),
      admin,
    );
    await statements().draftMonth(july);
    const afterWeek = (await liveOf(emmaId)).filter(
      (row) => row.periodStart >= july,
    );
    expect(afterWeek).toEqual([
      expect.objectContaining({
        periodStart: civil('2027-07-05'),
        periodEnd: civil('2027-07-12'),
        state: 'DRAFT',
        totalCentavos: 6_500,
      }),
    ]);

    await statements().draftPeriodAsAdministrator(
      period('2027-07-01', '2027-08-01'),
      admin,
    );
    const afterMonth = (await liveOf(emmaId)).filter(
      (row) => row.periodStart >= july,
    );
    expect(afterMonth).toEqual([
      expect.objectContaining({
        periodStart: july,
        periodEnd: civil('2027-08-01'),
        totalCentavos: 13_000,
      }),
    ]);
  });

  it('never drafts the Coordinator for less than a month', async () => {
    const admin = await administrator();
    await statements().draftPeriodAsAdministrator(
      period('2027-08-02', '2027-08-09'),
      admin,
    );
    await expect(
      world.prisma.payStatement.count({
        where: {
          staffMemberId: carolinaId,
          deletedAt: null,
          periodStart: { gte: civil('2027-08-01') },
        },
      }),
    ).resolves.toBe(0);
  });
});

// The real database error, as the adapter's translation sees it.
const overlapCode = (error: unknown): string => {
  try {
    rethrowPeriodOverlap(error);
    return 'not translated';
  } catch (translated) {
    return translated instanceof BackOfficeError
      ? translated.code
      : String(translated);
  }
};
