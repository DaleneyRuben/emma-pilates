import { randomUUID } from 'node:crypto';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import type { EvaluationTestWorld } from './evaluation-test-support';

const day = 24 * 60 * 60 * 1_000;
const branchId = deterministicId('branch:centro');

export const civil = (text: string) => new Date(`${text}T00:00:00.000Z`);

// The payroll and finance fixes (FIX-007) seed Clients, Plan sales, voids,
// Salary Payments, and Studio Settings versions straight into the world.
export const payrollFixtures = (
  world: () => EvaluationTestWorld,
  administrator: () => Promise<AuthenticatedPrincipal>,
) => {
  const newClient = async (name: string, broughtBy?: string) => {
    const clientId = randomUUID();
    await world().prisma.client.create({
      data: { id: clientId, name, referralCode: `REF-${clientId.slice(0, 8)}` },
    });
    if (broughtBy !== undefined) {
      await world().prisma.clientAcquisition.create({
        data: {
          clientId,
          declaredChannel: 'TRAINER',
          channel: 'TRAINER',
          referralCode: `T-${clientId.slice(0, 6)}`,
          referrerStaffMemberId: broughtBy,
        },
      });
    }
    return clientId;
  };

  // A Plan sale with its Subscription. `decidedAt` is the approval instant;
  // the Subscription runs from `startsOn` for `durationDays`.
  const sell = async (input: {
    clientId: string;
    decidedAt: Date;
    startsOn: Date;
    durationDays?: number;
    classAllowance?: number;
    method?: 'CASH' | 'COURTESY';
    priceCentavos?: number;
  }) => {
    const durationDays = input.durationDays ?? 30;
    const classAllowance = input.classAllowance ?? 8;
    const price = input.priceCentavos ?? 59_000;
    const admin = await administrator();
    const planId = randomUUID();
    await world().prisma.plan.create({
      data: {
        id: planId,
        name: `Plan ${planId.slice(0, 6)}`,
        durationDays,
        classAllowance,
        priceCentavos: price,
        displayOrder: 95,
        hiddenAt: civil('2027-01-01'),
      },
    });
    const payment = await world().prisma.payment.create({
      data: {
        clientId: input.clientId,
        planId,
        planNameSnapshot: 'Plan',
        durationDaysSnapshot: durationDays,
        classAllowanceSnapshot: classAllowance,
        planPriceCentavos: price,
        creditAppliedCentavos: 0,
        amountDueCentavos: price,
        startsOn: input.startsOn,
        method: input.method ?? 'CASH',
        collectedAtBranchId: input.method === 'COURTESY' ? null : branchId,
        kind: 'PLAN',
        state: 'CONFIRMED',
        submittedByAccountId: admin.accountId,
        submittedAt: input.decidedAt,
        decidedByAccountId: admin.accountId,
        decidedAt: input.decidedAt,
        createdAt: input.decidedAt,
        subscription: {
          create: {
            clientId: input.clientId,
            planId,
            planNameSnapshot: 'Plan',
            durationDaysSnapshot: durationDays,
            originalClassAllowance: classAllowance,
            remainingClassAllowance: classAllowance,
            startsOn: input.startsOn,
            endsOn: new Date(
              input.startsOn.getTime() + (durationDays - 1) * day,
            ),
            activatedAt: input.decidedAt,
          },
        },
      },
      select: { id: true, amountDueCentavos: true },
    });
    return payment;
  };

  const voidSale = (paymentId: string, at: Date) =>
    world().prisma.$transaction(async (transaction) => {
      const admin = await administrator();
      await transaction.payment.update({
        where: { id: paymentId },
        data: {
          state: 'VOIDED',
          voidedAt: at,
          voidedByAccountId: admin.accountId,
          voidReason: 'Error',
        },
      });
      await transaction.subscription.updateMany({
        where: { paymentId },
        data: { endedByVoid: true },
      });
    });

  const salary = async (staffMemberId: string, amountCentavos: number) => {
    const admin = await administrator();
    await world().prisma.salaryPayment.create({
      data: {
        staffMemberId,
        amountCentavos,
        paidOn: civil('2027-02-10'),
        recordedByAccountId: admin.accountId,
      },
    });
  };

  // A new Studio Settings version, copied from the latest, as of `createdAt`.
  const nextSettingsVersion = async (overrides: {
    taxRatePercent: number;
    createdAt: Date;
  }) => {
    const current = await world().prisma.studioSettingsVersion.findFirstOrThrow(
      {
        orderBy: { version: 'desc' },
      },
    );
    const copy: Partial<typeof current> = { ...current };
    delete copy.id;
    delete copy.createdAt;
    await world().prisma.studioSettingsVersion.create({
      data: {
        ...(copy as Omit<typeof current, 'id' | 'createdAt'>),
        version: current.version + 1,
        taxRatePercent: overrides.taxRatePercent,
        createdByAccountId: (await administrator()).accountId,
        createdAt: overrides.createdAt,
      },
    });
    return current;
  };

  return { newClient, sell, voidSale, salary, nextSettingsVersion };
};
