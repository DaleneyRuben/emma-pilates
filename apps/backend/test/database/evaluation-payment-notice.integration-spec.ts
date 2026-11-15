import { randomUUID } from 'node:crypto';
import { createPrismaEvaluationCommands } from '../../src/booking/evaluations/prisma-evaluation-commands';
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

const later = new Date(fixtureNow.getTime() + 60 * 60 * 1_000);

// Walkthrough n.º 65: a paid Evaluation's receipt raises the same
// «Comprobante por revisar» a Plan transfer does, and the decision settles it.
describe('the evaluation payment notice on the Administrator bell', () => {
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

  const paidHoldWithReceipt = async (name: string, startsAt: string) => {
    const email = `${randomUUID().slice(0, 8)}@example.com`;
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
    const client = await world.principalOf(email);
    const booked = await evaluations().bookPaidEvaluation(
      await slotIdAt(world.prisma, mondayBlockId, startsAt),
      client,
      randomUUID(),
    );
    const paymentId = booked.paymentId!;
    const receiptId = randomUUID();
    await world.prisma.imageAsset.create({
      data: {
        id: receiptId,
        ownerAccountId: client.accountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: `pending/transfer_receipt/${receiptId}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: fixtureNow,
        expiresAt: new Date(fixtureNow.getTime() + 15 * 60 * 1_000),
        finalizedAt: fixtureNow,
      },
    });
    await evaluations().attachEvaluationReceipt(
      { paymentId, imageAssetId: receiptId },
      client,
    );
    return { paymentId, evaluationId: booked.id, client };
  };

  const notices = (paymentId: string) =>
    world.prisma.notification.findMany({
      where: { businessEventKey: `payment-submitted:${paymentId}` },
      select: { accountId: true, type: true, title: true, readAt: true },
    });

  it('asks the Administrator to review the receipt and settles on confirm', async () => {
    const { paymentId } = await paidHoldWithReceipt(
      'Lucia Aviso',
      '2026-09-28T15:15:00.000Z',
    );
    const administrator = await admin();

    await expect(notices(paymentId)).resolves.toEqual(
      expect.arrayContaining([
        {
          accountId: administrator.accountId,
          type: 'payment_submitted',
          title: 'Comprobante por revisar',
          readAt: null,
        },
      ]),
    );

    await payments(later).confirmTransfer({ paymentId }, administrator);

    const settled = await notices(paymentId);
    expect(settled.length).toBeGreaterThan(0);
    expect(
      settled.every((notice) => notice.readAt?.getTime() === later.getTime()),
    ).toBe(true);
  });

  it('settles the notice on reject', async () => {
    const { paymentId } = await paidHoldWithReceipt(
      'Rosa Aviso',
      '2026-10-05T15:15:00.000Z',
    );

    await payments(later).rejectTransfer(
      { paymentId, reason: 'El monto no coincide.' },
      await admin(),
    );

    const settled = await notices(paymentId);
    expect(settled.length).toBeGreaterThan(0);
    expect(settled.every((notice) => notice.readAt !== null)).toBe(true);
  });

  it('settles the notice when she cancels the Evaluation', async () => {
    const { paymentId, evaluationId, client } = await paidHoldWithReceipt(
      'Clara Aviso',
      '2026-10-12T15:15:00.000Z',
    );

    await evaluations(later).cancelClientEvaluation(evaluationId, client);

    const settled = await notices(paymentId);
    expect(settled.length).toBeGreaterThan(0);
    expect(settled.every((notice) => notice.readAt !== null)).toBe(true);
  });
  // Walkthrough n.º 65: the queue and «Revisar pago» name the sale and its
  // time, not the Plan she holds.
  it('names the evaluation and when it is in the queue and the review', async () => {
    const { paymentId } = await paidHoldWithReceipt(
      'Lucia Etiqueta',
      '2026-10-19T15:15:00.000Z',
    );
    const administrator = await admin();

    const queue = await payments().listPendingPayments(administrator);
    expect(queue.find((row) => row.id === paymentId)).toMatchObject({
      planName: 'Evaluación nutricional',
      kind: 'evaluation',
      evaluationStartsAt: new Date('2026-10-19T15:15:00.000Z'),
    });
    await expect(
      payments().readPaymentReview({ paymentId }, administrator),
    ).resolves.toMatchObject({
      planName: 'Evaluación nutricional',
      evaluationStartsAt: new Date('2026-10-19T15:15:00.000Z'),
    });
  });
});
