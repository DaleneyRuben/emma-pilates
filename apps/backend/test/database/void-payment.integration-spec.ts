import { randomUUID } from 'node:crypto';
import {
  AttendanceOutcome,
  BookingCancellationCause,
  BookingState,
  PaymentState,
  PrismaClient,
} from '../../src/generated/prisma/client';
import { createPrismaOversight } from '../../src/booking/administration/prisma-oversight';
import { VoidSaleError } from '../../src/booking/payments/void-sale';
import { createPrismaVoidPayment } from '../../src/booking/payments/prisma-void-payment';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const later = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1_000);
const yesterday = new Date('2026-09-20T00:00:00.000Z');

const codeOf = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    if (error instanceof VoidSaleError) return error.code;
    return String(error);
  }
};

describe('voiding a sale', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;
  const voids = () => createPrismaVoidPayment(world.prisma);

  beforeAll(async () => {
    world = await startPaymentWorld();
    prisma = world.prisma;
  });

  afterAll(async () => {
    await world?.stop();
  });

  const cashSale = async () => {
    const buyer = await world.newClient(`Anulada ${randomUUID().slice(0, 6)}`);
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    const payment = await world
      .commands()
      .recordCashPayment(
        { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
        assistant,
        randomUUID(),
      );
    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { paymentId: payment.id },
    });
    const session = await prisma.session.findFirstOrThrow({
      where: {
        branchId: centro.id,
        state: 'SCHEDULED',
        startsAt: { gt: later },
      },
    });
    const future = await prisma.booking.create({
      data: {
        sessionId: session.id,
        clientId: buyer.clientId,
        subscriptionId: subscription.id,
        createdByAccountId: buyer.accountId,
        createdAt: now,
      },
    });
    const pastSession = await prisma.session.findFirstOrThrow({
      where: {
        branchId: centro.id,
        state: 'SCHEDULED',
        startsAt: { lt: now },
      },
      orderBy: { startsAt: 'desc' },
    });
    const attended = await prisma.booking.create({
      data: {
        sessionId: pastSession.id,
        clientId: buyer.clientId,
        subscriptionId: subscription.id,
        createdByAccountId: buyer.accountId,
        createdAt: now,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        bookingId: attended.id,
        outcome: AttendanceOutcome.ATTENDED,
        recordedByAccountId: assistant.accountId,
        recordedAt: now,
      },
    });
    return { buyer, payment, subscription, future, attended, assistant };
  };

  it('ends the Subscription, cancels future Bookings, and keeps Attendance', async () => {
    const sale = await cashSale();
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );

    const voided = await voids().voidPayment({
      paymentId: sale.payment.id,
      reason: 'Registrada dos veces',
      actorAccountId: administrator.accountId,
      now,
    });

    expect(voided).toMatchObject({
      state: 'voided',
      voidReason: 'Registrada dos veces',
      cancelledBookings: 1,
    });
    await expect(
      prisma.payment.findUniqueOrThrow({ where: { id: sale.payment.id } }),
    ).resolves.toMatchObject({
      state: PaymentState.VOIDED,
      voidReason: 'Registrada dos veces',
      voidedByAccountId: administrator.accountId,
      voidedAt: now,
    });
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: sale.subscription.id },
      }),
    ).resolves.toMatchObject({ endsOn: yesterday });
    await expect(
      prisma.booking.findUniqueOrThrow({ where: { id: sale.future.id } }),
    ).resolves.toMatchObject({
      state: BookingState.CANCELLED,
      cancellationCause: BookingCancellationCause.PAYMENT_VOIDED,
    });
    await expect(
      prisma.booking.findUniqueOrThrow({
        where: { id: sale.attended.id },
        include: { attendanceRecord: true },
      }),
    ).resolves.toMatchObject({
      state: BookingState.BOOKED,
      attendanceRecord: { outcome: AttendanceOutcome.ATTENDED },
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'payment.voided', targetId: sale.payment.id },
      }),
    ).resolves.toMatchObject({
      actorAccountId: administrator.accountId,
      metadata: expect.objectContaining({
        clientId: sale.buyer.clientId,
        reason: 'Registrada dos veces',
      }) as object,
    });
  });

  it('refuses a second void', async () => {
    const sale = await cashSale();
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    await voids().voidPayment({
      paymentId: sale.payment.id,
      reason: 'Registrada dos veces',
      actorAccountId: administrator.accountId,
      now,
    });

    await expect(
      codeOf(
        voids().voidPayment({
          paymentId: sale.payment.id,
          reason: 'Otra vez',
          actorAccountId: administrator.accountId,
          now,
        }),
      ),
    ).resolves.toBe('payment_already_voided');
  });

  it('leaves a voided sale out of the income totals and visible with its reason', async () => {
    const sale = await cashSale();
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    const range = {
      from: new Date('2026-09-01T04:00:00.000Z'),
      until: new Date('2026-10-01T04:00:00.000Z'),
    };
    const before = await createPrismaOversight(prisma, {
      now: () => now,
    }).incomeReport(range, administrator);

    await voids().voidPayment({
      paymentId: sale.payment.id,
      reason: 'Registrada dos veces',
      actorAccountId: administrator.accountId,
      now,
    });

    const after = await createPrismaOversight(prisma, {
      now: () => now,
    }).incomeReport(range, administrator);
    expect(after.totalCentavos).toBe(
      before.totalCentavos - sale.payment.amountDueCentavos,
    );
    expect(after.voided).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          paymentId: sale.payment.id,
          voidReason: 'Registrada dos veces',
          amountDueCentavos: sale.payment.amountDueCentavos,
        }),
      ]),
    );
    expect(
      after.voided.reduce((sum, row) => sum + row.amountDueCentavos, 0),
    ).not.toBe(0);
  });
});
