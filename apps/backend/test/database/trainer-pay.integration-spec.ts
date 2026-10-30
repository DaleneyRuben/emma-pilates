import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaPayStatements } from '../../src/back-office/payroll/prisma-pay-statements';
import { trainerMonthFacts } from '../../src/back-office/payroll/trainer-pay-facts';
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

const september = new Date('2026-09-01T00:00:00.000Z');

// One class of 3 (6,500), one of 6 (8,100), a no-show counted in a class of
// 5 (7,300), one minimum_not_met (2,500), and 10 % of a Bs 780 first Plan
// (7,800). Hand total 32,200 centavos.
const handCheckedTotalCentavos = 32_200;

describe('trainer pay statements', () => {
  let world: EvaluationTestWorld;
  // September is paid once it is over in Bolivia (FIX-007).
  const afterSeptember = new Date('2026-10-01T13:00:00.000Z');
  const statements = (now: Date = fixtureNow) =>
    createPrismaPayStatements(world.prisma, {
      now: () => now,
      factsOfMonth: (from, until) =>
        trainerMonthFacts(world.prisma, from, until),
    });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const emma = () => world.principalOf('emma.vargas@example.com');
  const daniela = () => world.principalOf('daniela.ortiz@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('drafts the hand-checked month, pays once, and hides another Trainer', async () => {
    const prisma = world.prisma;
    const emmaId = deterministicId('staff-member:emma');
    const classTypeId = deterministicId('class-type:reformer');
    const branchId = deterministicId('branch:centro');
    const planId = deterministicId('plan:paquete-12');
    const admin = await administrator();

    const session = async (
      hour: number,
      students: number | null,
      cause: 'MINIMUM_NOT_MET' | null,
    ) => {
      await prisma.session.create({
        data: {
          id: randomUUID(),
          branchId,
          classTypeId,
          trainerStaffMemberId: emmaId,
          startsAt: new Date(
            `2026-09-07T${String(hour).padStart(2, '0')}:00:00.000Z`,
          ),
          endsAt: new Date(
            `2026-09-07T${String(hour + 1).padStart(2, '0')}:00:00.000Z`,
          ),
          capacity: 8,
          state: cause === null ? 'SCHEDULED' : 'CANCELLED',
          cancellationCause: cause,
          cancelledAt: cause === null ? null : fixtureNow,
          bookingsAtWindowClose: students,
        },
      });
    };
    await session(14, 3, null);
    await session(16, 6, null);
    await session(20, 5, null);
    await session(22, null, 'MINIMUM_NOT_MET');

    const clientId = randomUUID();
    await prisma.client.create({
      data: { id: clientId, name: 'Nora Pay', referralCode: 'REF-NORA-PAY' },
    });
    await prisma.staffMember.update({
      where: { id: emmaId },
      data: { referralCode: 'EMMA-PAY' },
    });
    await prisma.clientAcquisition.create({
      data: {
        clientId,
        declaredChannel: 'TRAINER',
        channel: 'TRAINER',
        referralCode: 'EMMA-PAY',
        referrerStaffMemberId: emmaId,
      },
    });
    const payment = async (amount: number, decidedAt: Date) => {
      await prisma.payment.create({
        data: {
          clientId,
          planId,
          planNameSnapshot: 'Mensual',
          durationDaysSnapshot: 30,
          classAllowanceSnapshot: 8,
          planPriceCentavos: 78_000,
          creditAppliedCentavos: 0,
          amountDueCentavos: amount,
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
              planNameSnapshot: 'Mensual',
              durationDaysSnapshot: 30,
              originalClassAllowance: 8,
              remainingClassAllowance: 8,
              startsOn: decidedAt,
              endsOn: new Date(decidedAt.getTime() + 20 * 24 * 60 * 60 * 1000),
              activatedAt: decidedAt,
            },
          },
        },
      });
    };
    await payment(78_000, new Date('2026-09-10T15:00:00.000Z'));
    await payment(78_000, new Date('2026-10-10T15:00:00.000Z'));

    const drafted = await statements().draftMonth(september);
    expect(drafted.drafted).toBeGreaterThanOrEqual(1);
    const listed = await statements().listStatements(
      { month: september },
      admin,
    );
    const emmaStatement = listed.find((row) => row.staffMemberId === emmaId);
    expect(emmaStatement).toMatchObject({
      state: 'draft',
      totalCentavos: handCheckedTotalCentavos,
    });

    const approved = await statements(afterSeptember).approveStatement(
      { statementId: emmaStatement!.id },
      admin,
    );
    expect(approved.state).toBe('approved');
    expect(approved.salaryPaymentId).not.toBeNull();
    const again = await statements(afterSeptember).approveStatement(
      { statementId: emmaStatement!.id },
      admin,
    );
    expect(again.salaryPaymentId).toBe(approved.salaryPaymentId);
    expect(
      await prisma.salaryPayment.count({ where: { staffMemberId: emmaId } }),
    ).toBe(1);

    const own = await statements().listOwnStatements(await emma());
    expect(own.map((row) => row.id)).toContain(emmaStatement!.id);
    await expect(
      codeOf(statements().listOwnStatements(await daniela())),
    ).resolves.toBe('resolved');
    expect(
      (await statements().listOwnStatements(await daniela())).map(
        (row) => row.id,
      ),
    ).not.toContain(emmaStatement!.id);
    await expect(
      codeOf(statements().listOwnStatements(await assistant())),
    ).resolves.toBe('back_office_access_denied');
    await expect(
      codeOf(
        statements().approveStatement(
          { statementId: emmaStatement!.id },
          await assistant(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');
    await expect(
      codeOf(statements().listStatements({ month: september }, await emma())),
    ).resolves.toBe('back_office_access_denied');
  });
});
