import { randomUUID } from 'node:crypto';
import { PaymentKind, PaymentState } from '../../src/generated/prisma/client';
import { createPrismaAdministratorPayments } from '../../src/booking/payments/prisma-administrator-payments';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
  today,
} from './payment-lifecycle-test-support';

// A pending Evaluation Payment and a pending Plan Payment are different
// sales. The unique index must allow both, and a second of the same kind
// answers 409 instead of a unique-constraint 500.
describe('a pending payment of another kind', () => {
  let world: PaymentWorld;

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const centro = () =>
    fixtures.branches.find((branch) => branch.name === 'Centro')!;

  const pendingEvaluation = async (clientId: string, accountId: string) =>
    world.prisma.payment.create({
      data: {
        clientId,
        planId: plan.id,
        planNameSnapshot: 'Evaluación nutricional',
        durationDaysSnapshot: plan.durationDays,
        classAllowanceSnapshot: 1,
        planPriceCentavos: 7_000,
        creditAppliedCentavos: 0,
        amountDueCentavos: 7_000,
        startsOn: today,
        method: 'TRANSFER',
        kind: PaymentKind.EVALUATION,
        state: PaymentState.PENDING,
        submittedByAccountId: accountId,
        submittedAt: now,
        createdAt: now,
      },
      select: { id: true },
    });

  const sellPlan = async (
    clientId: string,
    assistant: Awaited<ReturnType<PaymentWorld['staffPrincipal']>>,
  ) =>
    world
      .commands()
      .recordCashPayment(
        { clientId, planId: plan.id, branchId: centro().id },
        assistant,
        randomUUID(),
      );

  it('lets a plan transfer be submitted while an evaluation payment is pending', async () => {
    const buyer = await world.newClient('Plan con evaluación pendiente');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    await sellPlan(buyer.clientId, assistant);
    await pendingEvaluation(buyer.clientId, buyer.accountId);
    const intent = await world
      .commands()
      .createPurchaseIntent({ planId: plan.id }, buyer, randomUUID());
    const receipt = await world.readyReceipt(buyer.accountId);
    await world
      .commands()
      .attachReceipt(
        { purchaseIntentId: intent.id, imageAssetId: receipt.id },
        buyer,
        randomUUID(),
      );

    const submitted = await world
      .commands()
      .submitTransfer({ purchaseIntentId: intent.id }, buyer, randomUUID());

    expect(submitted.state).toBe('pending');
    await expect(
      world.prisma.payment.count({
        where: { clientId: buyer.clientId, state: PaymentState.PENDING },
      }),
    ).resolves.toBe(2);
  });

  it('lets a front-desk QR stay pending beside a pending evaluation payment', async () => {
    const buyer = await world.newClient('QR con evaluación pendiente');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    await sellPlan(buyer.clientId, assistant);
    await pendingEvaluation(buyer.clientId, buyer.accountId);
    const receipt = await world.readyReceipt(assistant.accountId);

    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
      },
      assistant,
      randomUUID(),
    );

    expect(pending.state).toBe('pending');
  });

  it('names a pending evaluation in the administrator ledger', async () => {
    const buyer = await world.newClient('Nombre de evaluación');
    await pendingEvaluation(buyer.clientId, buyer.accountId);

    const page = await createPrismaAdministratorPayments(world.prisma).list({
      page: 1,
      pageSize: 20,
      status: 'pending',
      invoice: 'all',
      query: 'Nombre de evaluación',
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        kind: 'evaluation',
        planName: 'Evaluación nutricional',
      }),
    ]);
  });
});
