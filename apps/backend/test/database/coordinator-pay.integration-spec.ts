import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { coordinatorMonthFacts } from '../../src/back-office/payroll/coordinator-pay-facts';
import { createPrismaPayStatements } from '../../src/back-office/payroll/prisma-pay-statements';
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
    if (error instanceof BackOfficeError) return error.code;
    return String(error);
  }
};

const december = new Date('2026-12-01T00:00:00.000Z');
const openingRates = {
  classCentavos: 6_500,
  includedStudents: 4,
  extraStudentCentavos: 800,
  minimumNotMetCentavos: 2_500,
  commissionPercent: 10,
};

// Base 350,000, one 30-day new Client 5,000, one 60-day 8,000, a single
// class and a Trainer-brought Client 0, and the bonus at the target 40,000.
// Hand total 403,000 centavos.
const handCheckedTotalCentavos = 403_000;

describe('coordinator pay statements', () => {
  let world: EvaluationTestWorld;
  // December is paid once it is over, the Coordinator's renewal week
  // included (FIX-007).
  const afterDecember = new Date('2027-01-08T13:00:00.000Z');
  const statements = (now: Date = fixtureNow) =>
    createPrismaPayStatements(world.prisma, {
      now: () => now,
      factsOfMonth: () =>
        Promise.resolve({ rates: openingRates, trainers: [] }),
      coordinatorFactsOfMonth: (from, until) =>
        coordinatorMonthFacts(world.prisma, from, until),
    });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const coordinator = () => world.principalOf('carolina.rivas@example.com');
  const trainer = () => world.principalOf('emma.vargas@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('drafts the hand-checked month, pays once, and hides it from her', async () => {
    const prisma = world.prisma;
    const coordinatorId = deterministicId('staff-member:carolina');
    const emmaId = deterministicId('staff-member:emma');
    const branchId = deterministicId('branch:centro');
    const admin = await administrator();
    const current = await prisma.studioSettingsVersion.findFirstOrThrow({
      orderBy: { version: 'desc' },
    });
    await prisma.studioSettingsVersion.create({
      data: {
        version: current.version + 1,
        cancellationWindowMinutes: current.cancellationWindowMinutes,
        minimumBookings: current.minimumBookings,
        minimumBookingsCheckLeadMinutes:
          current.minimumBookingsCheckLeadMinutes,
        startDateLimitDays: current.startDateLimitDays,
        founderPlaces: current.founderPlaces,
        founderDiscountPercent: current.founderDiscountPercent,
        founderGapDays: current.founderGapDays,
        guestPassesPerClient: current.guestPassesPerClient,
        invitesPerHostPerMonth: current.invitesPerHostPerMonth,
        inviteRewardClasses: current.inviteRewardClasses,
        taxRatePercent: current.taxRatePercent,
        evaluationPriceCentavos: current.evaluationPriceCentavos,
        nutritionistFeeCentavos: current.nutritionistFeeCentavos,
        renewalTargetMonths1To6Percent: current.renewalTargetMonths1To6Percent,
        renewalTargetMonths7To12Percent:
          current.renewalTargetMonths7To12Percent,
        renewalTargetFromMonth13Percent:
          current.renewalTargetFromMonth13Percent,
        openingDate: new Date('2026-12-15T00:00:00.000Z'),
        createdByAccountId: admin.accountId,
      },
    });

    const buy = async (
      name: string,
      durationDays: number,
      classAllowance: number,
      decidedAt: Date,
      trainerBrought: boolean,
    ) => {
      const clientId = randomUUID();
      await prisma.client.create({
        data: {
          id: clientId,
          name,
          referralCode: `REF-${clientId.slice(0, 8)}`,
        },
      });
      if (trainerBrought) {
        await prisma.clientAcquisition.create({
          data: {
            clientId,
            declaredChannel: 'TRAINER',
            channel: 'TRAINER',
            referralCode: 'EMMA-PAY',
            referrerStaffMemberId: emmaId,
          },
        });
      }
      const planId = randomUUID();
      await prisma.plan.create({
        data: {
          id: planId,
          name,
          durationDays,
          classAllowance,
          priceCentavos: 78_000,
          displayOrder: 90,
        },
      });
      await prisma.payment.create({
        data: {
          clientId,
          planId,
          planNameSnapshot: name,
          durationDaysSnapshot: durationDays,
          classAllowanceSnapshot: classAllowance,
          planPriceCentavos: 78_000,
          creditAppliedCentavos: 0,
          amountDueCentavos: 78_000,
          startsOn: decidedAt,
          method: 'CASH',
          collectedAtBranchId: branchId,
          kind: 'PLAN',
          state: 'CONFIRMED',
          submittedByAccountId: admin.accountId,
          submittedAt: decidedAt,
          decidedByAccountId: admin.accountId,
          decidedAt,
          subscription: {
            create: {
              clientId,
              planId,
              planNameSnapshot: name,
              durationDaysSnapshot: durationDays,
              originalClassAllowance: classAllowance,
              remainingClassAllowance: classAllowance,
              startsOn: decidedAt,
              endsOn: new Date(
                decidedAt.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000,
              ),
              activatedAt: decidedAt,
            },
          },
        },
      });
    };
    await buy('Mensual', 30, 8, new Date('2026-12-04T15:00:00.000Z'), false);
    await buy('Bimestral', 60, 16, new Date('2026-12-06T15:00:00.000Z'), false);
    await buy(
      'Clase suelta',
      30,
      1,
      new Date('2026-12-08T15:00:00.000Z'),
      false,
    );
    await buy('Traída', 60, 16, new Date('2026-12-09T15:00:00.000Z'), true);
    const renew = async (endsOn: Date, nextStartsOn: Date | null) => {
      const clientId = randomUUID();
      const planId = randomUUID();
      await prisma.plan.create({
        data: {
          id: planId,
          name: `Renovación ${planId.slice(0, 4)}`,
          durationDays: 30,
          classAllowance: 8,
          priceCentavos: 78_000,
          displayOrder: 91,
          hiddenAt: new Date('2026-12-01T00:00:00.000Z'),
        },
      });
      await prisma.client.create({
        data: {
          id: clientId,
          name: `Renueva ${clientId.slice(0, 4)}`,
          referralCode: `REF-${clientId.slice(0, 8)}`,
        },
      });
      // Owner decision 5: «renovó» is measured by purchase, so each Plan is a
      // real sale. The next one is bought the day it starts.
      const subscription = async (startsOn: Date, ends: Date) => {
        await prisma.payment.create({
          data: {
            clientId,
            planId,
            planNameSnapshot: 'Mensual',
            durationDaysSnapshot: 30,
            classAllowanceSnapshot: 8,
            planPriceCentavos: 78_000,
            creditAppliedCentavos: 0,
            amountDueCentavos: 78_000,
            startsOn,
            method: 'CASH',
            collectedAtBranchId: branchId,
            kind: 'PLAN',
            state: 'CONFIRMED',
            submittedByAccountId: admin.accountId,
            submittedAt: startsOn,
            decidedByAccountId: admin.accountId,
            decidedAt: new Date(startsOn.getTime() + 15 * 60 * 60 * 1000),
            subscription: {
              create: {
                clientId,
                planId,
                planNameSnapshot: 'Mensual',
                durationDaysSnapshot: 30,
                originalClassAllowance: 8,
                remainingClassAllowance: 0,
                startsOn,
                endsOn: ends,
                activatedAt: startsOn,
              },
            },
          },
        });
      };
      await subscription(
        new Date(endsOn.getTime() - 29 * 24 * 60 * 60 * 1000),
        endsOn,
      );
      if (nextStartsOn !== null) {
        await subscription(
          nextStartsOn,
          new Date(nextStartsOn.getTime() + 29 * 24 * 60 * 60 * 1000),
        );
      }
    };
    await renew(
      new Date('2026-12-10T00:00:00.000Z'),
      new Date('2026-12-17T00:00:00.000Z'),
    );
    await renew(
      new Date('2026-12-12T00:00:00.000Z'),
      new Date('2026-12-19T00:00:00.000Z'),
    );

    const drafted = await statements().draftMonth(december);
    expect(drafted.drafted).toBe(1);
    const listed = await statements().listStatements(
      { month: december },
      admin,
    );
    expect(listed).toEqual([
      expect.objectContaining({
        staffMemberId: coordinatorId,
        state: 'draft',
        totalCentavos: handCheckedTotalCentavos,
      }),
    ]);

    const approved = await statements(afterDecember).approveStatement(
      { statementId: listed[0].id },
      admin,
    );
    expect(approved.state).toBe('approved');
    expect(approved.salaryPaymentId).not.toBeNull();
    const again = await statements(afterDecember).approveStatement(
      { statementId: listed[0].id },
      admin,
    );
    expect(again.salaryPaymentId).toBe(approved.salaryPaymentId);
    expect(
      await prisma.salaryPayment.count({
        where: { staffMemberId: coordinatorId },
      }),
    ).toBe(1);

    await expect(
      codeOf(
        statements().listStatements({ month: december }, await coordinator()),
      ),
    ).resolves.toBe('back_office_access_denied');
    await expect(
      codeOf(
        statements().approveStatement(
          { statementId: listed[0].id },
          await coordinator(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');
    await expect(
      codeOf(statements().listOwnStatements(await coordinator())),
    ).resolves.toBe('back_office_access_denied');
    await expect(
      codeOf(statements().listStatements({ month: december }, await trainer())),
    ).resolves.toBe('back_office_access_denied');
  });
});
