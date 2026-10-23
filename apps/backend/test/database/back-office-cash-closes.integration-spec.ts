import { randomUUID } from 'node:crypto';
import { BackOfficeError } from '../../src/back-office/back-office-errors';
import { createPrismaCashCloses } from '../../src/back-office/cash-close/prisma-cash-closes';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  fixtures,
  hour,
  now,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

type PaymentWorld = Awaited<ReturnType<typeof startPaymentWorld>>;

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
const branchNamed = (name: string) =>
  fixtures.branches.find((branch) => branch.name === name)!.id;

// `now` is Monday 2026-09-21 at 11:00 in Bolivia; the day closes at 19:00.
const evening = new Date(now.getTime() + 8 * hour);
const nextMorning = new Date(now.getTime() + 22 * hour);

describe('Prisma Back Office cash closes', () => {
  let world: PaymentWorld;
  let assistant: AuthenticatedPrincipal;
  let administrator: AuthenticatedPrincipal;
  const centro = branchNamed('Centro');
  const equipetrol = branchNamed('Equipetrol');
  const urubo = branchNamed('Urubó');
  const closes = (at: Date = evening) =>
    createPrismaCashCloses(world.prisma, { now: () => at });

  // A Client with no Plan buys one in cash at the Branch, at `at`.
  const cashSale = async (branchId: string, at: Date) => {
    const buyer = await world.newClient(`Efectivo ${randomUUID()}`);
    return world
      .commands(at)
      .recordCashPayment(
        { clientId: buyer.clientId, planId: plan.id, branchId },
        administrator,
        randomUUID(),
      );
  };

  // PAY-006 will void a sale; until then a decided Payment is final, so the
  // spec moves one out of «confirmed» the only way the schema allows today.
  const voidOutsideTheRules = (paymentId: string) =>
    world.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SET LOCAL session_replication_role = replica`;
      await transaction.$executeRaw`
        UPDATE "booking"."payments" SET "state" = 'rejected'
        WHERE "id" = ${paymentId}::uuid`;
    });

  beforeAll(async () => {
    world = await startPaymentWorld();
    assistant = await world.staffPrincipal('camila.rojas@example.com');
    administrator = await world.staffPrincipal('paola.mendoza@example.com');
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('expects the day’s confirmed cash Payments at the Branch, and nothing else', async () => {
    const before = await closes().readToday({ branchId: urubo }, administrator);
    const first = await cashSale(urubo, now);
    await cashSale(urubo, new Date(now.getTime() + hour));
    // The day before and another Branch never count.
    await cashSale(urubo, new Date(now.getTime() - 24 * hour));
    await cashSale(equipetrol, now);

    await expect(
      closes().readToday({ branchId: urubo }, administrator),
    ).resolves.toEqual({
      branchId: urubo,
      businessDate: civil('2026-09-21'),
      expectedCentavos: before.expectedCentavos + 2 * first.amountDueCentavos,
      cashPaymentCount: before.cashPaymentCount + 2,
      close: null,
    });
  });

  it('records one close a day per Branch, audited, and refuses a second', async () => {
    const sale = await cashSale(centro, now);
    const today = await closes().readToday({ branchId: centro }, assistant);
    expect(today.expectedCentavos).toBeGreaterThanOrEqual(
      sale.amountDueCentavos,
    );
    const key = randomUUID();
    const input = {
      branchId: centro,
      countedCentavos: today.expectedCentavos - 1_000,
      note: '  Faltó cambio  ',
    };

    const close = await closes().recordCashClose(input, assistant, key);
    expect(close).toEqual({
      id: expect.any(String) as string,
      branchId: centro,
      businessDate: civil('2026-09-21'),
      expectedCentavos: today.expectedCentavos,
      cashPaymentCount: today.cashPaymentCount,
      countedCentavos: today.expectedCentavos - 1_000,
      differenceCentavos: -1_000,
      note: 'Faltó cambio',
      closedAt: evening,
      closedByName: 'Camila Rojas',
    });
    // A lost response replays; the same close is never written twice.
    await expect(
      closes().recordCashClose(input, assistant, key),
    ).resolves.toEqual(close);
    await expect(
      codeOf(closes().recordCashClose(input, administrator, randomUUID())),
    ).resolves.toBe('cash_close_already_recorded');
    await expect(
      closes().readToday({ branchId: centro }, assistant),
    ).resolves.toMatchObject({ close });
    await expect(
      world.prisma.auditRecord.findMany({
        where: { targetId: close.id },
        select: {
          actionCode: true,
          actorRole: true,
          targetType: true,
          branchId: true,
          metadata: true,
        },
      }),
    ).resolves.toEqual([
      {
        actionCode: 'cash_close.recorded',
        actorRole: 'ASSISTANT',
        targetType: 'cash_close',
        branchId: centro,
        metadata: {
          businessDate: '2026-09-21',
          expectedCentavos: today.expectedCentavos,
          countedCentavos: today.expectedCentavos - 1_000,
          differenceCentavos: -1_000,
        },
      },
    ]);
    // History is never edited (BKO-003 migration trigger).
    await expect(
      world.prisma.cashClose.update({
        where: { id: close.id },
        data: { countedCentavos: 0 },
      }),
    ).rejects.toThrow();
  });

  it('lets only one of two simultaneous closes of the same day through', async () => {
    const outcomes = await Promise.all(
      [randomUUID(), randomUUID()].map((key) =>
        codeOf(
          closes().recordCashClose(
            { branchId: equipetrol, countedCentavos: 0, note: null },
            administrator,
            key,
          ),
        ),
      ),
    );
    expect(outcomes.sort()).toEqual([
      'cash_close_already_recorded',
      'resolved',
    ]);
  });

  it('lets only an Assistant at her Branch or an Administrator close, and only an Administrator read the history', async () => {
    const trainer = await world.staffPrincipal('emma.vargas@example.com');
    const nutritionist = await world.staffPrincipal(
      'gabriela.flores@example.com',
    );
    const client = await world.newClient('Curiosa');
    const close = (principal: AuthenticatedPrincipal, branchId: string) =>
      codeOf(
        closes().recordCashClose(
          { branchId, countedCentavos: 0, note: null },
          principal,
          randomUUID(),
        ),
      );

    await expect(close(assistant, urubo)).resolves.toBe('branch_not_assigned');
    await expect(
      codeOf(closes().readToday({ branchId: urubo }, assistant)),
    ).resolves.toBe('branch_not_assigned');
    for (const denied of [trainer, nutritionist, client]) {
      await expect(close(denied, centro)).resolves.toBe(
        'back_office_access_denied',
      );
      await expect(
        codeOf(closes().readToday({ branchId: centro }, denied)),
      ).resolves.toBe('back_office_access_denied');
    }
    for (const denied of [assistant, trainer, client]) {
      await expect(
        codeOf(
          closes().listCashCloses(
            { branchId: centro, month: '2026-09' },
            denied,
          ),
        ),
      ).resolves.toBe('back_office_access_denied');
    }
    await expect(
      close(administrator, '00000000-0000-4000-8000-000000000000'),
    ).resolves.toBe('branch_not_found');
    await expect(
      codeOf(
        closes().recordCashClose(
          { branchId: centro, countedCentavos: -1, note: null },
          administrator,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('invalid_back_office_value');
  });

  it('shows the history with differences, later adjustments, and days left unclosed', async () => {
    // Urubo: a sale yesterday never closed, today's close, then a sale voided
    // after it (−) and a late sale (+), both adjustments of the closed day.
    const today = await closes().readToday({ branchId: urubo }, administrator);
    const late = await cashSale(urubo, new Date(evening.getTime() + hour / 2));
    const firstOfToday = await world.prisma.payment.findFirstOrThrow({
      where: {
        collectedAtBranchId: urubo,
        decidedAt: { gte: now, lt: evening },
      },
      orderBy: { decidedAt: 'asc' },
    });
    const close = await closes(
      new Date(evening.getTime() - hour / 4),
    ).recordCashClose(
      {
        branchId: urubo,
        countedCentavos: today.expectedCentavos,
        note: null,
      },
      administrator,
      randomUUID(),
    );
    await voidOutsideTheRules(firstOfToday.id);

    const history = await closes(nextMorning).listCashCloses(
      { branchId: urubo, month: '2026-09' },
      administrator,
    );

    expect(history.branchId).toBe(urubo);
    expect(history.month).toBe('2026-09');
    const byDate = new Map(
      history.days.map((day) => [day.businessDate.toISOString(), day]),
    );
    expect(byDate.get(civil('2026-09-21').toISOString())).toEqual({
      businessDate: civil('2026-09-21'),
      status: 'closed',
      cashSalesCentavos:
        today.expectedCentavos -
        firstOfToday.amountDueCentavos +
        late.amountDueCentavos,
      cashPaymentCount: today.cashPaymentCount,
      close: {
        ...close,
        adjustmentCentavos:
          late.amountDueCentavos - firstOfToday.amountDueCentavos,
      },
    });
    expect(byDate.get(civil('2026-09-20').toISOString())).toMatchObject({
      status: 'missing',
      close: null,
    });
    // Newest first, never a day after today, and only days with cash or a close.
    const dates = history.days.map((day) => day.businessDate.getTime());
    expect(dates).toEqual([...dates].sort((left, right) => right - left));
    expect(Math.max(...dates)).toBeLessThanOrEqual(
      civil('2026-09-22').getTime(),
    );
    expect(
      history.days.every(
        (day) => day.cashPaymentCount > 0 || day.close !== null,
      ),
    ).toBe(true);
    expect(history.missingDays).toBe(
      history.days.filter((day) => day.status === 'missing').length,
    );
  });
});
