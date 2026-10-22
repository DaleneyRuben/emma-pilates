import { randomUUID } from 'node:crypto';
import { impersonating, openImpersonation } from './impersonation-test-support';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import { createPrismaReceiptRead } from '../../src/booking/payments/prisma-receipt-read';
import {
  codeOf,
  fixtures,
  hour,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

describe('Prisma payment lifecycle (review, expiry, and cash)', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;
  let commands: PaymentWorld['commands'];
  let staffPrincipal: PaymentWorld['staffPrincipal'];
  let newClient: PaymentWorld['newClient'];
  let readyReceipt: PaymentWorld['readyReceipt'];
  let seedAward: PaymentWorld['seedAward'];

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma, commands, staffPrincipal, newClient, readyReceipt, seedAward } =
      world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('expires open Purchase Intents after 24 hours and releases their Credit once', async () => {
    const buyer = await newClient('Olvidada');
    await seedAward(buyer.clientId);
    const intent = await commands().createPurchaseIntent(
      { planId: plan.id },
      buyer,
      randomUUID(),
    );
    const receipt = await readyReceipt(buyer.accountId);
    await commands().attachReceipt(
      { purchaseIntentId: intent.id, imageAssetId: receipt.id },
      buyer,
      randomUUID(),
    );
    const later = new Date(now.getTime() + 25 * hour);

    // Open Intents left by the earlier tests expire in the same sweep.
    await expect(
      commands(later).expirePurchaseIntents(),
    ).resolves.toBeGreaterThanOrEqual(1);
    await expect(commands(later).expirePurchaseIntents()).resolves.toBe(0);

    await expect(
      prisma.purchaseIntent.findUniqueOrThrow({ where: { id: intent.id } }),
    ).resolves.toMatchObject({ state: 'EXPIRED', expiredAt: later });
    await expect(
      commands(later).readOpenPurchaseIntent(buyer),
    ).resolves.toBeNull();
    await expect(commands(later).readCreditSummary(buyer)).resolves.toEqual({
      availableCentavos: 6000,
      reservedCentavos: 0,
    });
    await expect(
      prisma.imageAsset.findUniqueOrThrow({ where: { id: receipt.id } }),
    ).resolves.toMatchObject({ deletionDueAt: later });
    await expect(
      codeOf(
        commands(later).submitTransfer(
          { purchaseIntentId: intent.id },
          buyer,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('purchase_intent_not_open');
  });

  it('lists pending transfers oldest first and describes one for review', async () => {
    const admin = await staffPrincipal('paola.mendoza@example.com');
    const trainer = await staffPrincipal('emma.vargas@example.com');
    const first = await newClient('Primera Pendiente');
    const second = await newClient('Segunda Pendiente');
    const submit = async (buyer: typeof first, at: Date) => {
      const intent = await commands(at).createPurchaseIntent(
        { planId: plan.id },
        buyer,
        randomUUID(),
      );
      const receipt = await readyReceipt(buyer.accountId);
      await commands(at).attachReceipt(
        { purchaseIntentId: intent.id, imageAssetId: receipt.id },
        buyer,
        randomUUID(),
      );
      return {
        payment: await commands(at).submitTransfer(
          { purchaseIntentId: intent.id },
          buyer,
          randomUUID(),
        ),
        receipt,
      };
    };
    const later = new Date(now.getTime() + 30 * 60 * 1_000);
    const { payment: newer } = await submit(second, later);
    const { payment: older, receipt } = await submit(first, now);

    await expect(codeOf(commands().listPendingPayments(trainer))).resolves.toBe(
      'access_denied',
    );

    const pending = await commands().listPendingPayments(admin);
    const ids = pending.map((entry) => entry.id);
    expect(ids.indexOf(older.id)).toBeLessThan(ids.indexOf(newer.id));
    expect(pending.find((entry) => entry.id === older.id)).toMatchObject({
      clientName: 'Primera Pendiente',
      planName: 'Paquete de 8 clases',
      amountDueCentavos: 56_000,
      submittedAt: now,
      receiptAvailable: true,
    });

    await expect(
      commands().readPaymentReview({ paymentId: older.id }, admin),
    ).resolves.toMatchObject({
      id: older.id,
      clientName: 'Primera Pendiente',
      state: 'pending',
      receipt: { imageAssetId: receipt.id, mediaType: 'image/jpeg' },
    });
    await expect(
      codeOf(commands().readPaymentReview({ paymentId: randomUUID() }, admin)),
    ).resolves.toBe('payment_not_found');
    await expect(
      createPrismaReceiptRead(prisma).readReceiptObject(
        { paymentId: older.id, variant: 'readable' },
        admin,
      ),
    ).resolves.toMatchObject({
      mediaType: 'image/jpeg',
      objectKey: expect.stringContaining('pending/') as string,
    });
  });

  it('lets two Administrators decide the same Payment at once with exactly one outcome', async () => {
    const buyer = await newClient('Disputada');
    const admin = await staffPrincipal('paola.mendoza@example.com');
    const intent = await commands().createPurchaseIntent(
      { planId: plan.id },
      buyer,
      randomUUID(),
    );
    const receipt = await readyReceipt(buyer.accountId);
    await commands().attachReceipt(
      { purchaseIntentId: intent.id, imageAssetId: receipt.id },
      buyer,
      randomUUID(),
    );
    const pending = await commands().submitTransfer(
      { purchaseIntentId: intent.id },
      buyer,
      randomUUID(),
    );

    const results = await Promise.allSettled([
      commands().confirmTransfer({ paymentId: pending.id }, admin),
      commands().rejectTransfer(
        { paymentId: pending.id, reason: 'Monto incorrecto' },
        admin,
      ),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0].reason as PaymentRuleError).code).toBe(
      'payment_confirmation_conflict',
    );
    const settled = await prisma.payment.findUniqueOrThrow({
      where: { id: pending.id },
      include: { subscription: true },
    });
    expect(['CONFIRMED', 'REJECTED']).toContain(settled.state);
    expect(settled.subscription === null).toBe(settled.state === 'REJECTED');
  });

  it('audits a cash Payment taken while an Administrator sees the app as the Assistant to the Administrator (FUT-001)', async () => {
    const buyer = await newClient('Efectivo suplantado');
    const assistant = await staffPrincipal('camila.rojas@example.com');
    const paola = await staffPrincipal('paola.mendoza@example.com');
    const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
    const impersonation = await openImpersonation(prisma, {
      administratorAccountId: paola.accountId,
      staffMemberId: (assistant.identity as { staffMemberId: string })
        .staffMemberId,
      now,
    });

    const payment = await commands().recordCashPayment(
      { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
      impersonating(assistant, impersonation),
      randomUUID(),
    );

    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'payment.cash_confirmed', targetId: payment.id },
      }),
    ).resolves.toMatchObject({
      actorAccountId: paola.accountId,
      actorRole: 'ADMINISTRATOR',
      impersonationId: impersonation.id,
      branchId: centro.id,
    });
  });

  it('records an instant cash Payment at an assigned Branch, spending Credit and activating the Subscription', async () => {
    const buyer = await newClient('Efectivo');
    await seedAward(buyer.clientId);
    const assistant = await staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
    const equipetrol = fixtures.branches.find((b) => b.name === 'Equipetrol')!;
    const key = randomUUID();

    await expect(
      codeOf(
        commands().recordCashPayment(
          {
            clientId: buyer.clientId,
            planId: plan.id,
            branchId: equipetrol.id,
          },
          assistant,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('branch_not_assigned');
    await expect(
      codeOf(
        commands().recordCashPayment(
          { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
          buyer,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('access_denied');

    const payment = await commands().recordCashPayment(
      { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
      assistant,
      key,
    );

    expect(payment).toMatchObject({
      method: 'cash',
      state: 'confirmed',
      creditAppliedCentavos: 6000,
      amountDueCentavos: 50_000,
      decidedAt: now,
    });
    expect(payment.subscriptionId).toEqual(expect.any(String));
    await expect(commands().readCreditSummary(buyer)).resolves.toEqual({
      availableCentavos: 0,
      reservedCentavos: 0,
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: { actionCode: 'payment.cash_confirmed', targetId: payment.id },
      }),
    ).resolves.toMatchObject({ branchId: centro.id, actorRole: 'ASSISTANT' });
    await expect(
      commands().recordCashPayment(
        { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
        assistant,
        key,
      ),
    ).resolves.toMatchObject({ id: payment.id });
    await expect(
      codeOf(
        commands().recordCashPayment(
          { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
          assistant,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('subscription_not_expired');
  });

  it('refuses cash while the Client has an open Purchase Intent', async () => {
    const buyer = await newClient('Con intención');
    const assistant = await staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
    await commands().createPurchaseIntent(
      { planId: plan.id },
      buyer,
      randomUUID(),
    );

    await expect(
      codeOf(
        commands().recordCashPayment(
          { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
          assistant,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('purchase_intent_open_exists');
  });

  it('completes a Credit-only purchase without any transfer when Credit covers the Plan', async () => {
    const buyer = await newClient('Con crédito');
    const poor = await newClient('Sin crédito');
    for (let award = 0; award < 10; award += 1) await seedAward(buyer.clientId);
    await seedAward(poor.clientId);

    await expect(
      codeOf(
        commands().completeCreditPurchase(
          { planId: plan.id },
          poor,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('credit_insufficient');

    const payment = await commands().completeCreditPurchase(
      { planId: plan.id },
      buyer,
      randomUUID(),
    );

    expect(payment).toMatchObject({
      method: 'credit_only',
      state: 'confirmed',
      creditAppliedCentavos: 56_000,
      amountDueCentavos: 0,
    });
    expect(payment.subscriptionId).toEqual(expect.any(String));
    await expect(commands().readCreditSummary(buyer)).resolves.toEqual({
      availableCentavos: 4000,
      reservedCentavos: 0,
    });
    await expect(
      prisma.auditRecord.findFirst({
        where: {
          actionCode: 'payment.credit_only_confirmed',
          targetId: payment.id,
        },
      }),
    ).resolves.toMatchObject({
      actorAccountId: buyer.accountId,
      branchId: null,
    });
    await expect(
      prisma.notification.findFirst({
        where: { accountId: buyer.accountId, type: 'payment_confirmed' },
      }),
    ).resolves.not.toBeNull();
  });
});
