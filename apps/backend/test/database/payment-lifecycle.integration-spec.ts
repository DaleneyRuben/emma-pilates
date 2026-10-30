import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  codeOf,
  hour,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
  today,
} from './payment-lifecycle-test-support';

describe('Prisma payment lifecycle', () => {
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

  it('attaches and replaces a ready receipt owned by the same Account', async () => {
    const buyer = await newClient('Compradora');
    const other = await newClient('Otra');
    const intent = await commands().createPurchaseIntent(
      { planId: plan.id },
      buyer,
      randomUUID(),
    );
    const first = await readyReceipt(buyer.accountId);
    const second = await readyReceipt(buyer.accountId);
    const foreign = await readyReceipt(other.accountId);
    const pending = await readyReceipt(buyer.accountId, 'PENDING');

    await expect(
      codeOf(
        commands().attachReceipt(
          { purchaseIntentId: intent.id, imageAssetId: foreign.id },
          buyer,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('payment_receipt_invalid_owner');
    await expect(
      codeOf(
        commands().attachReceipt(
          { purchaseIntentId: intent.id, imageAssetId: pending.id },
          buyer,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('payment_receipt_not_ready');

    await expect(
      commands().attachReceipt(
        { purchaseIntentId: intent.id, imageAssetId: first.id },
        buyer,
        randomUUID(),
      ),
    ).resolves.toMatchObject({ id: intent.id, receiptAttached: true });
    await expect(
      prisma.imageAsset.findUniqueOrThrow({ where: { id: first.id } }),
    ).resolves.toMatchObject({
      state: 'ATTACHED',
      attachedAt: now,
      deletionDueAt: null,
    });

    await commands().attachReceipt(
      { purchaseIntentId: intent.id, imageAssetId: second.id },
      buyer,
      randomUUID(),
    );
    const [replaced, current] = await Promise.all([
      prisma.imageAsset.findUniqueOrThrow({ where: { id: first.id } }),
      prisma.imageAsset.findUniqueOrThrow({ where: { id: second.id } }),
    ]);
    expect(replaced).toMatchObject({ state: 'READY', deletionDueAt: now });
    expect(current).toMatchObject({ state: 'ATTACHED' });
  });

  it('submits a transfer as one pending Payment, notifies Administrators, and replays by key', async () => {
    const buyer = await newClient('Transferente');
    const admin = await prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      select: { id: true },
    });
    const intent = await commands().createPurchaseIntent(
      { planId: plan.id },
      buyer,
      randomUUID(),
    );

    await expect(
      codeOf(
        commands().submitTransfer(
          { purchaseIntentId: intent.id },
          buyer,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('payment_receipt_required');

    const receipt = await readyReceipt(buyer.accountId);
    await commands().attachReceipt(
      { purchaseIntentId: intent.id, imageAssetId: receipt.id },
      buyer,
      randomUUID(),
    );
    const key = randomUUID();
    const payment = await commands().submitTransfer(
      { purchaseIntentId: intent.id },
      buyer,
      key,
    );

    expect(payment).toMatchObject({
      method: 'transfer',
      state: 'pending',
      planName: 'Paquete de 8 clases',
      planPriceCentavos: 56_000,
      creditAppliedCentavos: 0,
      discountCentavos: 8_400,
      amountDueCentavos: 47_600,
      submittedAt: now,
      decidedAt: null,
      rejectionReason: null,
      subscriptionId: null,
    });
    await expect(
      commands().submitTransfer({ purchaseIntentId: intent.id }, buyer, key),
    ).resolves.toMatchObject({ id: payment.id });
    await expect(
      codeOf(
        commands().submitTransfer(
          { purchaseIntentId: intent.id },
          buyer,
          randomUUID(),
        ),
      ),
    ).resolves.toBe('purchase_intent_not_open');
    await expect(
      prisma.purchaseIntent.findUniqueOrThrow({ where: { id: intent.id } }),
    ).resolves.toMatchObject({ state: 'SUBMITTED', submittedAt: now });
    await expect(
      prisma.notification.count({
        where: {
          accountId: admin.id,
          businessEventKey: `payment-submitted:${payment.id}`,
        },
      }),
    ).resolves.toBe(1);
    await expect(commands().readCurrentPayment(buyer)).resolves.toMatchObject({
      id: payment.id,
      state: 'pending',
    });
  });

  it('confirms a transfer: activates the Subscription, awards no Credit, leaves the Referral pending, audits, and notifies', async () => {
    const buyer = await newClient('Confirmada');
    const referrer = await newClient('Referente');
    await seedAward(buyer.clientId);
    await prisma.referral.create({
      data: {
        referrerClientId: referrer.clientId,
        referredClientId: buyer.clientId,
        createdAt: now,
      },
    });
    const admin = await staffPrincipal('paola.mendoza@example.com');
    const trainer = await staffPrincipal('emma.vargas@example.com');

    const intent = await commands().createPurchaseIntent(
      { planId: plan.id },
      buyer,
      randomUUID(),
    );
    expect(intent).toMatchObject({
      creditReservedCentavos: 0,
      discountCentavos: 8_400,
      amountDueCentavos: 47_600,
    });
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
    expect(pending).toMatchObject({
      creditAppliedCentavos: 0,
      discountCentavos: 8_400,
      amountDueCentavos: 47_600,
    });

    await expect(
      codeOf(commands().confirmTransfer({ paymentId: pending.id }, buyer)),
    ).resolves.toBe('access_denied');
    await expect(
      codeOf(commands().confirmTransfer({ paymentId: pending.id }, trainer)),
    ).resolves.toBe('access_denied');

    const decidedAt = new Date(now.getTime() + 2 * hour);
    const confirmed = await commands(decidedAt).confirmTransfer(
      { paymentId: pending.id },
      admin,
    );

    expect(confirmed).toMatchObject({
      id: pending.id,
      state: 'confirmed',
      decidedAt,
    });
    expect(confirmed.subscriptionId).toEqual(expect.any(String));
    await expect(
      prisma.subscription.findUniqueOrThrow({
        where: { id: confirmed.subscriptionId! },
      }),
    ).resolves.toMatchObject({
      clientId: buyer.clientId,
      paymentId: pending.id,
      planNameSnapshot: 'Paquete de 8 clases',
      durationDaysSnapshot: 30,
      originalClassAllowance: 8,
      remainingClassAllowance: 8,
      startsOn: today,
      // booking ADR-0005: the Start Date plus 30 days minus one.
      endsOn: new Date('2026-10-20T00:00:00.000Z'),
      state: 'ACTIVE',
    });
    await expect(
      prisma.creditReservation.count({ where: { clientId: buyer.clientId } }),
    ).resolves.toBe(0);
    await expect(
      prisma.referral.findUniqueOrThrow({
        where: { referredClientId: buyer.clientId },
      }),
    ).resolves.toMatchObject({
      state: 'PENDING',
      qualifiedPaymentId: null,
      awardCentavos: null,
    });
    await expect(
      prisma.creditLedgerEntry.count({
        where: { clientId: referrer.clientId },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.auditRecord.findFirst({
        where: {
          actionCode: 'payment.transfer_confirmed',
          targetId: pending.id,
        },
      }),
    ).resolves.toMatchObject({
      outcome: 'SUCCEEDED',
      actorAccountId: admin.accountId,
      actorRole: 'ADMINISTRATOR',
    });
    await expect(
      prisma.notification.findFirst({
        where: { accountId: buyer.accountId, type: 'payment_confirmed' },
      }),
    ).resolves.toMatchObject({
      message: 'Tu pago fue confirmado. ¡Ya puedes reservar clases!',
    });
    await expect(
      prisma.imageAsset.findUniqueOrThrow({ where: { id: receipt.id } }),
    ).resolves.toMatchObject({
      deletionDueAt: new Date(now.getTime() + 45 * 24 * hour),
    });

    await expect(
      commands(decidedAt).confirmTransfer({ paymentId: pending.id }, admin),
    ).resolves.toMatchObject({ id: pending.id, state: 'confirmed' });
    await expect(
      codeOf(
        commands(decidedAt).rejectTransfer(
          { paymentId: pending.id, reason: 'tarde' },
          admin,
        ),
      ),
    ).resolves.toBe('payment_confirmation_conflict');
    await expect(commands().readCurrentPayment(buyer)).resolves.toMatchObject({
      id: pending.id,
      state: 'confirmed',
    });
  });

  it('rejects a transfer with a trimmed reason and lets the Client start again without Credit', async () => {
    const buyer = await newClient('Rechazada');
    await seedAward(buyer.clientId);
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

    const rejected = await commands().rejectTransfer(
      {
        paymentId: pending.id,
        reason: '  El monto no coincide con el plan.  ',
      },
      admin,
    );

    expect(rejected).toMatchObject({
      state: 'rejected',
      rejectionReason: 'El monto no coincide con el plan.',
      subscriptionId: null,
    });
    await expect(
      prisma.creditLedgerEntry.count({ where: { clientId: buyer.clientId } }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditRecord.findFirst({
        where: {
          actionCode: 'payment.transfer_rejected',
          targetId: pending.id,
        },
      }),
    ).resolves.toMatchObject({ outcome: 'SUCCEEDED' });
    await expect(
      prisma.notification.findFirst({
        where: { accountId: buyer.accountId, type: 'payment_rejected' },
      }),
    ).resolves.toMatchObject({
      message:
        'Tu comprobante fue rechazado: El monto no coincide con el plan. Sube uno nuevo para activar tu plan.',
    });
    await expect(
      commands().rejectTransfer(
        { paymentId: pending.id, reason: 'El monto no coincide con el plan.' },
        admin,
      ),
    ).resolves.toMatchObject({ id: pending.id, state: 'rejected' });
    await expect(
      codeOf(
        commands().rejectTransfer(
          { paymentId: pending.id, reason: 'Otra razón' },
          admin,
        ),
      ),
    ).resolves.toBe('payment_confirmation_conflict');
    await expect(
      codeOf(commands().confirmTransfer({ paymentId: pending.id }, admin)),
    ).resolves.toBe('payment_confirmation_conflict');
    await expect(
      commands().createPurchaseIntent({ planId: plan.id }, buyer, randomUUID()),
    ).resolves.toMatchObject({
      state: 'open',
      creditReservedCentavos: 0,
      discountCentavos: 8_400,
      amountDueCentavos: 47_600,
    });
  });
});
