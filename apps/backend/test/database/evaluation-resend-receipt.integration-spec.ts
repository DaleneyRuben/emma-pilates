import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { deterministicId } from '../../src/development-fixtures/deterministic-id';
import {
  createCarlaBlocks,
  slotIdAt,
} from './evaluation-bookings-test-support';
import {
  EvaluationTestWorld,
  fixtureNow,
  startEvaluationTestWorld,
} from './evaluation-test-support';

const hour = 60 * 60 * 1_000;

// Board C13h (owner 2026-11-27): a rejected receipt keeps the paid
// Evaluation booked, and the Client sends another one while the slot is still
// bookable. A replacement Payment carries it; the rejected one stays history.
describe('paid Evaluation: another receipt after a rejection', () => {
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

  const admin = () => world.principalOf('paola.mendoza@example.com');

  const client = async (name: string, email: string) => {
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

  const rejectedHold = async (email: string, startsAt: string) => {
    const principal = await world.principalOf(email);
    const slotId = await slotIdAt(world.prisma, mondayBlockId, startsAt);
    const booked = await evaluations().bookPaidEvaluation(
      slotId,
      principal,
      randomUUID(),
    );
    const paymentId = booked.paymentId!;
    await payments().rejectTransfer(
      { paymentId, reason: 'Es una imagen de un gato.' },
      await admin(),
    );
    return { principal, evaluationId: booked.id, paymentId };
  };

  const receipt = async (ownerAccountId: string) => {
    const id = randomUUID();
    await world.prisma.imageAsset.create({
      data: {
        id,
        ownerAccountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: `pending/transfer_receipt/${id}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: fixtureNow,
        expiresAt: new Date(fixtureNow.getTime() + 15 * 60 * 1_000),
        finalizedAt: fixtureNow,
      },
    });
    return id;
  };

  const codeOf = async (work: Promise<unknown>): Promise<string> => {
    try {
      await work;
      return 'resolved';
    } catch (error) {
      if (error instanceof PaymentRuleError) return error.code;
      const coded = error as { code?: unknown };
      return typeof coded.code === 'string' ? coded.code : String(error);
    }
  };

  it('keeps the Evaluation booked and asks for another receipt', async () => {
    const buyer = await client('Isa Rojas', 'isa.rojas@example.com');
    const hold = await rejectedHold(
      'isa.rojas@example.com',
      '2026-09-28T15:15:00.000Z',
    );

    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: hold.evaluationId },
        select: { state: true, paymentId: true },
      }),
    ).resolves.toEqual({ state: 'BOOKED', paymentId: hold.paymentId });
    const notice = await world.prisma.notification.findFirstOrThrow({
      where: { accountId: buyer.accountId, type: 'payment_rejected' },
      select: { message: true },
    });
    expect(notice.message).toContain('Sube uno nuevo');

    const page = await evaluations().listClientEvaluations(
      { scope: 'upcoming' },
      buyer,
    );
    expect(
      page.items.find((row) => row.id === hold.evaluationId),
    ).toMatchObject({
      state: 'booked',
      paymentState: 'rejected',
      receiptUploadable: true,
      priceCentavos: expect.any(Number) as number,
    });
    const view = page.items.find((row) => row.id === hold.evaluationId)!;
    expect(view.priceCentavos).toBeGreaterThan(0);
  });

  it('puts another receipt on a new pending Payment for the same Evaluation', async () => {
    const buyer = await client('Lia Rojas', 'lia.rojas@example.com');
    const hold = await rejectedHold(
      'lia.rojas@example.com',
      '2026-09-28T16:00:00.000Z',
    );
    const imageAssetId = await receipt(buyer.accountId);

    await evaluations().attachEvaluationReceipt(
      { evaluationId: hold.evaluationId, imageAssetId },
      buyer,
    );

    const evaluation = await world.prisma.evaluation.findUniqueOrThrow({
      where: { id: hold.evaluationId },
      select: { state: true, paymentId: true },
    });
    expect(evaluation.state).toBe('BOOKED');
    expect(evaluation.paymentId).not.toBe(hold.paymentId);
    const [old, replacement] = await Promise.all([
      world.prisma.payment.findUniqueOrThrow({
        where: { id: hold.paymentId },
        select: { state: true, amountDueCentavos: true },
      }),
      world.prisma.payment.findUniqueOrThrow({
        where: { id: evaluation.paymentId! },
        select: {
          state: true,
          kind: true,
          method: true,
          amountDueCentavos: true,
          receiptImageAssetId: true,
        },
      }),
    ]);
    expect(old.state).toBe('REJECTED');
    expect(replacement).toEqual({
      state: 'PENDING',
      kind: 'EVALUATION',
      method: 'TRANSFER',
      amountDueCentavos: old.amountDueCentavos,
      receiptImageAssetId: imageAssetId,
    });
    const page = await evaluations().listClientEvaluations(
      { scope: 'upcoming' },
      buyer,
    );
    expect(
      page.items.find((row) => row.id === hold.evaluationId),
    ).toMatchObject({ paymentState: 'pending', receiptUploadable: false });
  });

  it('refuses another receipt once the slot is too close to book', async () => {
    const buyer = await client('Ana Rojas', 'ana.rojas@example.com');
    const hold = await rejectedHold(
      'ana.rojas@example.com',
      '2026-10-05T16:00:00.000Z',
    );
    const imageAssetId = await receipt(buyer.accountId);
    const late = new Date(
      new Date('2026-10-05T16:00:00.000Z').getTime() - 2 * hour,
    );

    await expect(
      codeOf(
        evaluations(late).attachEvaluationReceipt(
          { evaluationId: hold.evaluationId, imageAssetId },
          buyer,
        ),
      ),
    ).resolves.toBe('payment_not_pending');
  });

  it('releases the slot when no new receipt arrives within a day', async () => {
    await client('Eva Rojas', 'eva.rojas@example.com');
    const hold = await rejectedHold(
      'eva.rojas@example.com',
      '2026-10-05T15:15:00.000Z',
    );

    await expect(
      evaluations(
        new Date(fixtureNow.getTime() + 23 * hour),
      ).releaseExpiredEvaluationHolds(),
    ).resolves.toBe(0);
    await expect(
      evaluations(
        new Date(fixtureNow.getTime() + 25 * hour),
      ).releaseExpiredEvaluationHolds(),
    ).resolves.toBeGreaterThanOrEqual(1);
    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: hold.evaluationId },
        select: { state: true, cancellationCause: true },
      }),
    ).resolves.toEqual({
      state: 'CANCELLED',
      cancellationCause: 'PAYMENT_EXPIRED',
    });
  });
  it('cancels as before when the rejection comes inside 3 hours', async () => {
    const buyer = await client('Mia Rojas', 'mia.rojas@example.com');
    const principal = await world.principalOf('mia.rojas@example.com');
    const startsAt = '2026-10-12T15:15:00.000Z';
    const slotId = await slotIdAt(world.prisma, mondayBlockId, startsAt);
    const booked = await evaluations().bookPaidEvaluation(
      slotId,
      principal,
      randomUUID(),
    );
    const late = new Date(new Date(startsAt).getTime() - 2 * hour);

    await payments(late).rejectTransfer(
      { paymentId: booked.paymentId!, reason: 'No coincide.' },
      await admin(),
    );

    await expect(
      world.prisma.evaluation.findUniqueOrThrow({
        where: { id: booked.id },
        select: { state: true, cancellationCause: true },
      }),
    ).resolves.toEqual({
      state: 'CANCELLED',
      cancellationCause: 'PAYMENT_REJECTED',
    });
    const notice = await world.prisma.notification.findFirstOrThrow({
      where: { accountId: buyer.accountId, type: 'payment_rejected' },
      select: { message: true },
    });
    expect(notice.message).toContain('Puedes reservar la evaluación de nuevo');
  });

  it('refuses another receipt while another evaluation transfer is pending', async () => {
    const buyer = await client('Zoe Rojas', 'zoe.rojas@example.com');
    const hold = await rejectedHold(
      'zoe.rojas@example.com',
      '2026-10-12T16:00:00.000Z',
    );
    await evaluations().bookPaidEvaluation(
      await slotIdAt(world.prisma, mondayBlockId, '2026-10-19T15:15:00.000Z'),
      buyer,
      randomUUID(),
    );
    const imageAssetId = await receipt(buyer.accountId);

    await expect(
      codeOf(
        evaluations().attachEvaluationReceipt(
          { evaluationId: hold.evaluationId, imageAssetId },
          buyer,
        ),
      ),
    ).resolves.toBe('evaluation_payment_pending');
  });
});
