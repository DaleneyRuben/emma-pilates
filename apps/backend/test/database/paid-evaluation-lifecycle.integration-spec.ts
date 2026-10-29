import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { nutritionistCostOfMonth } from '../../src/booking/evaluations/nutritionist-cost';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { createPrismaReceiptRead } from '../../src/booking/payments/prisma-receipt-read';
import { createPrismaAdministratorPayments } from '../../src/booking/payments/prisma-administrator-payments';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  codeOf,
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

const september = new Date('2026-09-01T00:00:00.000Z');

// FIX-003: a paid Evaluation's Payment has no Purchase Intent. Rejecting,
// cancelling, and confirming it must not fall through the Plan path.
describe('paid Evaluation payment lifecycle', () => {
  let world: EvaluationTestWorld;
  let mondayBlockId: string;

  const evaluations = (at: Date = fixtureNow) =>
    createPrismaEvaluationCommands(world.prisma, { now: () => at });
  const payments = (at: Date = fixtureNow) =>
    createPrismaPaymentCommands(world.prisma, { now: () => at });

  beforeAll(async () => {
    world = await startEvaluationTestWorld();
    ({ mondayBlockId } = await createCarlaBlocks(world, evaluations()));
  });

  afterAll(async () => {
    await world?.stop();
  });

  const slot = (startsAt: string) =>
    slotIdAt(world.prisma, mondayBlockId, startsAt);
  const admin = () => world.principalOf('paola.mendoza@example.com');

  const eightClassClient = async (name: string, email: string) => {
    await world.prisma.client.create({
      data: {
        name,
        referralCode: `REF-${randomUUID().slice(0, 8)}`,
        account: {
          create: {
            email,
            activatedAt: fixtureNow,
            emailVerifiedAt: fixtureNow,
          },
        },
        subscriptions: {
          create: {
            planId: deterministicId('plan:paquete-8'),
            planNameSnapshot: 'Paquete de 8 clases',
            durationDaysSnapshot: 30,
            originalClassAllowance: 8,
            remainingClassAllowance: 8,
            startsOn: new Date('2026-09-01T00:00:00.000Z'),
            endsOn: new Date('2026-11-30T00:00:00.000Z'),
            activatedAt: fixtureNow,
          },
        },
      },
    });
    return world.principalOf(email);
  };

  const paidHold = async (
    email: string,
    startsAt: string,
  ): Promise<{
    evaluationId: string;
    paymentId: string;
    accountId: string;
  }> => {
    const client = await world.principalOf(email);
    const slotId = await slot(startsAt);
    const booked = await evaluations().bookPaidEvaluation(
      slotId,
      client,
      randomUUID(),
    );
    if (booked.paymentId === null) {
      throw new Error('A paid Evaluation books with its own Payment');
    }
    return {
      evaluationId: booked.id,
      paymentId: booked.paymentId,
      accountId: client.accountId,
    };
  };

  const paymentCode = async (work: Promise<unknown>): Promise<string> => {
    try {
      await work;
      return 'resolved';
    } catch (error) {
      if (error instanceof PaymentRuleError) return error.code;
      return String(error);
    }
  };

  it('rejects an evaluation transfer and cancels the Evaluation', async () => {
    const buyer = await eightClassClient('Nora Paz', 'nora@example.com');
    const hold = await paidHold('nora@example.com', '2026-09-28T15:15:00.000Z');

    const rejected = await payments().rejectTransfer(
      { paymentId: hold.paymentId, reason: 'El monto no coincide.' },
      await admin(),
    );

    expect(rejected).toMatchObject({
      id: hold.paymentId,
      state: 'rejected',
      rejectionReason: 'El monto no coincide.',
      subscriptionId: null,
    });
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: hold.evaluationId },
        select: { state: true, cancellationCause: true },
      }),
    ).resolves.toEqual({
      state: 'CANCELLED',
      cancellationCause: 'PAYMENT_REJECTED',
    });
    await expect(
      world.prisma.auditRecord.findFirst({
        where: {
          actionCode: 'payment.transfer_rejected',
          targetId: hold.paymentId,
        },
      }),
    ).resolves.toMatchObject({ outcome: 'SUCCEEDED' });
    await expect(
      world.prisma.notification.findFirst({
        where: { accountId: buyer.accountId, type: 'payment_rejected' },
      }),
    ).resolves.toMatchObject({
      destinationType: 'evaluation',
      destinationId: hold.evaluationId,
    });
    await expect(
      payments().createPurchaseIntent(
        { planId: deterministicId('plan:paquete-8') },
        buyer,
        randomUUID(),
      ),
    ).resolves.toMatchObject({ state: 'open' });
  });

  it('rejects the pending Payment when the Client cancels the Evaluation', async () => {
    const buyer = await eightClassClient('Olga Paz', 'olga@example.com');
    const hold = await paidHold('olga@example.com', '2026-10-05T15:15:00.000Z');

    await evaluations().cancelClientEvaluation(hold.evaluationId, buyer);

    await expect(
      world.prisma.payment.findUniqueOrThrow({
        where: { id: hold.paymentId },
        select: { state: true, rejectionReason: true },
      }),
    ).resolves.toEqual({
      state: 'REJECTED',
      rejectionReason: 'La evaluación fue cancelada',
    });
    await expect(
      payments().createPurchaseIntent(
        { planId: deterministicId('plan:paquete-8') },
        buyer,
        randomUUID(),
      ),
    ).resolves.toMatchObject({ state: 'open' });
  });

  it('refuses to confirm a transfer whose Evaluation is no longer booked', async () => {
    const buyer = await eightClassClient('Pilar Paz', 'pilar@example.com');
    const hold = await paidHold(
      'pilar@example.com',
      '2026-10-12T15:15:00.000Z',
    );
    await world.prisma.$executeRaw`
      UPDATE booking.evaluations
      SET state = 'cancelled',
          cancelled_at = ${fixtureNow},
          cancelled_by_account_id = ${buyer.accountId}::uuid,
          cancellation_cause = 'client_request'
      WHERE id = ${hold.evaluationId}::uuid`;

    await expect(
      paymentCode(
        payments().confirmTransfer(
          { paymentId: hold.paymentId },
          await admin(),
        ),
      ),
    ).resolves.toBe('payment_confirmation_conflict');
    await expect(
      world.prisma.payment.findUniqueOrThrow({
        where: { id: hold.paymentId },
        select: { state: true, subscription: { select: { id: true } } },
      }),
    ).resolves.toEqual({ state: 'PENDING', subscription: null });
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: hold.evaluationId },
        select: { nutritionistCostCentavos: true },
      }),
    ).resolves.toEqual({ nutritionistCostCentavos: null });
  });

  it('audits and notifies when an evaluation transfer is confirmed', async () => {
    await eightClassClient('Rita Paz', 'rita@example.com');
    const hold = await paidHold('rita@example.com', '2026-10-19T15:15:00.000Z');

    await payments().confirmTransfer(
      { paymentId: hold.paymentId },
      await admin(),
    );

    await expect(
      world.prisma.auditRecord.findFirst({
        where: {
          actionCode: 'payment.transfer_confirmed',
          targetId: hold.paymentId,
        },
      }),
    ).resolves.toMatchObject({
      outcome: 'SUCCEEDED',
      actorRole: 'ADMINISTRATOR',
    });
    await expect(
      world.prisma.notification.findFirst({
        where: { accountId: hold.accountId, type: 'payment_confirmed' },
      }),
    ).resolves.toMatchObject({
      destinationType: 'evaluation',
      destinationId: hold.evaluationId,
      message: 'Tu pago fue confirmado. Tu evaluación quedó reservada.',
    });
  });

  it('carries the same receipt image a Plan transfer uses', async () => {
    const buyer = await eightClassClient('Sara Paz', 'sara@example.com');
    const hold = await paidHold('sara@example.com', '2026-10-05T16:00:00.000Z');
    const receipt = await world.prisma.imageAsset.create({
      data: {
        ownerAccountId: buyer.accountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: `pending/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: fixtureNow,
        expiresAt: new Date(fixtureNow.getTime() + 15 * 60 * 1_000),
        finalizedAt: fixtureNow,
      },
      select: { id: true },
    });

    const evaluationCommands = evaluations() as {
      attachEvaluationReceipt: (
        command: { paymentId: string; imageAssetId: string },
        principal: Awaited<ReturnType<EvaluationTestWorld['principalOf']>>,
      ) => Promise<void>;
    };
    await evaluationCommands.attachEvaluationReceipt(
      { paymentId: hold.paymentId, imageAssetId: receipt.id },
      buyer,
    );

    const review = await payments().readPaymentReview(
      { paymentId: hold.paymentId },
      await admin(),
    );
    expect(review.receipt).toMatchObject({ imageAssetId: receipt.id });
    const object = await createPrismaReceiptRead(
      world.prisma,
    ).readReceiptObject(
      { paymentId: hold.paymentId, variant: 'readable' },
      await admin(),
    );
    expect(object.objectKey.includes(receipt.id)).toBe(true);
    const listed = await createPrismaAdministratorPayments(world.prisma).list({
      page: 1,
      pageSize: 50,
      status: 'pending',
      invoice: 'all',
    });
    expect(listed.items.find((row) => row.id === hold.paymentId)).toMatchObject(
      { receiptAvailable: true, kind: 'evaluation' },
    );
  });

  it('refuses a paid Evaluation when the covering Plan is not effective', async () => {
    const client = await world.prisma.client.create({
      data: {
        name: 'Eva Sin clases',
        referralCode: 'REF-EVA-NUT',
        account: {
          create: {
            email: 'eva@example.com',
            activatedAt: fixtureNow,
            emailVerifiedAt: fixtureNow,
          },
        },
        subscriptions: {
          create: {
            planId: deterministicId('plan:paquete-8'),
            planNameSnapshot: 'Paquete de 8 clases',
            durationDaysSnapshot: 30,
            originalClassAllowance: 8,
            remainingClassAllowance: 0,
            startsOn: new Date('2026-09-01T00:00:00.000Z'),
            endsOn: new Date('2026-11-30T00:00:00.000Z'),
            activatedAt: fixtureNow,
          },
        },
      },
      select: { account: { select: { email: true } } },
    });

    await expect(
      codeOf(
        evaluations().bookPaidEvaluation(
          await slot('2026-10-05T13:00:00.000Z'),
          await world.principalOf(client.account!.email),
          randomUUID(),
        ),
      ),
    ).resolves.toBe('no_eligible_subscription');
  });

  it('does not count a cancelled Evaluation toward the Nutritionist cost', async () => {
    const before = await nutritionistCostOfMonth(world.prisma, september);
    const ana = await world.principalOf('ana@example.com');
    const booked = await evaluations().bookEvaluation(
      await slot('2026-09-28T16:00:00.000Z'),
      ana,
      randomUUID(),
    );
    const held = await nutritionistCostOfMonth(world.prisma, september);
    expect(held).toBe(before + 5_000);

    await evaluations().cancelClientEvaluation(booked.id, ana);

    await expect(
      nutritionistCostOfMonth(world.prisma, september),
    ).resolves.toBe(before);
  });

  it('does not return a pending evaluation Payment as the current Plan payment', async () => {
    const buyer = await eightClassClient('Tina Paz', 'tina@example.com');
    const hold = await paidHold('tina@example.com', '2026-10-19T16:00:00.000Z');

    await expect(payments().readCurrentPayment(buyer)).resolves.toBeNull();
    await expect(
      world.prisma.payment.findUniqueOrThrow({
        where: { id: hold.paymentId },
        select: { kind: true, state: true },
      }),
    ).resolves.toEqual({ kind: 'EVALUATION', state: 'PENDING' });
  });
});
