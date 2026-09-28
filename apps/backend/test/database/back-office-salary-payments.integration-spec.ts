import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaSalaryPayments } from '../../src/back-office/payroll/prisma-salary-payments';
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

const civil = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('Prisma Back Office salary payments', () => {
  let world: EvaluationTestWorld;
  const payroll = () =>
    createPrismaSalaryPayments(world.prisma, { now: () => fixtureNow });
  const administrator = () => world.principalOf('paola.mendoza@example.com');
  const assistant = () => world.principalOf('camila.rojas@example.com');
  const staffIdOf = async (email: string) =>
    (
      await world.prisma.account.findFirstOrThrow({
        where: { email, deletedAt: null },
        select: { staffMemberId: true },
      })
    ).staffMemberId!;
  const auditsOf = (targetId: string) =>
    world.prisma.auditRecord.findMany({
      where: { targetId },
      orderBy: { occurredAt: 'asc' },
      select: {
        actionCode: true,
        actorAccountId: true,
        actorRole: true,
        targetType: true,
        branchId: true,
        metadata: true,
      },
    });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('records a Salary Payment once per Idempotency-Key with an audit record', async () => {
    const emma = await staffIdOf('emma.vargas@example.com');
    const admin = await administrator();
    const key = randomUUID();
    const input = {
      staffMemberId: emma,
      amountCentavos: 350_000,
      paidOn: civil('2026-09-20'),
    };
    const payment = await payroll().recordSalaryPayment(input, admin, key);
    expect(payment).toMatchObject({
      staffMemberId: emma,
      staffMemberName: 'Emma Vargas',
      amountCentavos: 350_000,
      paidOn: civil('2026-09-20'),
    });
    await expect(
      payroll().recordSalaryPayment(input, admin, key),
    ).resolves.toEqual(payment);
    await expect(
      codeOf(
        payroll().recordSalaryPayment(
          { ...input, amountCentavos: 1 },
          admin,
          key,
        ),
      ),
    ).resolves.toBe('idempotency_key_reused');
    await expect(auditsOf(payment.id)).resolves.toEqual([
      {
        actionCode: 'salary_payment.recorded',
        actorAccountId: admin.accountId,
        actorRole: 'ADMINISTRATOR',
        targetType: 'salary_payment',
        branchId: null,
        metadata: { amountCentavos: 350_000, paidOn: '2026-09-20' },
      },
    ]);
  });

  it('refuses invalid amounts, future dates, unknown Staff Members, and other Roles', async () => {
    const emma = await staffIdOf('emma.vargas@example.com');
    const record = async (
      input: Partial<{
        staffMemberId: string;
        amountCentavos: number;
        paidOn: Date;
      }>,
      principal = administrator(),
    ) =>
      codeOf(
        payroll().recordSalaryPayment(
          {
            staffMemberId: emma,
            amountCentavos: 100_000,
            paidOn: civil('2026-09-21'),
            ...input,
          },
          await principal,
          randomUUID(),
        ),
      );
    await expect(record({ amountCentavos: 0 })).resolves.toBe(
      'invalid_back_office_value',
    );
    await expect(record({ paidOn: civil('2026-09-22') })).resolves.toBe(
      'date_in_future',
    );
    await expect(record({ staffMemberId: randomUUID() })).resolves.toBe(
      'staff_member_not_found',
    );
    await expect(record({}, assistant())).resolves.toBe(
      'back_office_access_denied',
    );
    // Today in Bolivia, and any Role, including an Administrator.
    await expect(
      record({ staffMemberId: await staffIdOf('paola.mendoza@example.com') }),
    ).resolves.toBe('resolved');
  });

  it('corrects a Salary Payment and audits the previous values', async () => {
    const emma = await staffIdOf('emma.vargas@example.com');
    const daniela = await staffIdOf('daniela.ortiz@example.com');
    const admin = await administrator();
    const payment = await payroll().recordSalaryPayment(
      {
        staffMemberId: emma,
        amountCentavos: 200_000,
        paidOn: civil('2026-09-01'),
      },
      admin,
      randomUUID(),
    );
    const corrected = await payroll().updateSalaryPayment(
      {
        salaryPaymentId: payment.id,
        staffMemberId: daniela,
        amountCentavos: 210_000,
        paidOn: civil('2026-09-01'),
      },
      admin,
    );
    expect(corrected).toMatchObject({
      id: payment.id,
      staffMemberId: daniela,
      amountCentavos: 210_000,
    });
    const audits = await auditsOf(payment.id);
    expect(audits.map((audit) => audit.actionCode)).toEqual([
      'salary_payment.recorded',
      'salary_payment.updated',
    ]);
    expect(audits[1].metadata).toEqual({
      previousStaffMemberId: emma,
      staffMemberId: daniela,
      previousAmountCentavos: 200_000,
      amountCentavos: 210_000,
    });
    await expect(
      codeOf(
        payroll().updateSalaryPayment(
          {
            salaryPaymentId: randomUUID(),
            staffMemberId: emma,
            amountCentavos: 1,
            paidOn: civil('2026-09-01'),
          },
          admin,
        ),
      ),
    ).resolves.toBe('salary_payment_not_found');
  });

  it('lists Salary Payments newest first with Staff Member and inclusive date filters', async () => {
    const andrea = await staffIdOf('andrea.suarez@example.com');
    const admin = await administrator();
    for (const [paidOn, amountCentavos] of [
      ['2026-08-31', 90_000],
      ['2026-09-05', 91_000],
      ['2026-09-15', 92_000],
    ] as const) {
      await payroll().recordSalaryPayment(
        { staffMemberId: andrea, amountCentavos, paidOn: civil(paidOn) },
        admin,
        randomUUID(),
      );
    }
    const page = await payroll().listSalaryPayments(
      {
        staffMemberId: andrea,
        from: civil('2026-09-01'),
        to: civil('2026-09-15'),
        page: 1,
        pageSize: 1,
      },
      admin,
    );
    expect(page).toMatchObject({
      page: 1,
      pageSize: 1,
      totalItems: 2,
      items: [
        {
          staffMemberId: andrea,
          staffMemberName: 'Andrea Suárez',
          amountCentavos: 92_000,
          paidOn: civil('2026-09-15'),
        },
      ],
    });
    const everyone = await payroll().listSalaryPayments(
      { page: 1, pageSize: 100 },
      admin,
    );
    expect(everyone.totalItems).toBeGreaterThanOrEqual(3);
    await expect(
      codeOf(
        payroll().listSalaryPayments(
          { page: 1, pageSize: 20 },
          await assistant(),
        ),
      ),
    ).resolves.toBe('back_office_access_denied');
  });
});
