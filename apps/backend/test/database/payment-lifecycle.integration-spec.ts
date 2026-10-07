import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { BookingAccessDeniedError } from '../../src/booking/commands/create-booking';
import { PaymentRuleError } from '../../src/booking/payments/payment-errors';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { createPrismaReceiptRead } from '../../src/booking/payments/prisma-receipt-read';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const now = new Date('2026-09-21T15:00:00.000Z');
const hour = 60 * 60 * 1_000;

describe('Prisma payment lifecycle', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });
  const plan = fixtures.plans.find((p) => p.name === 'Paquete de 8 clases')!;

  const commands = (at: Date = now) =>
    createPrismaPaymentCommands(prisma, {
      now: () => at,
      referralRewardCentavos: 6000,
    });

  const clientPrincipal = async (
    email: string,
  ): Promise<AuthenticatedPrincipal & { clientId: string }> => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: { id: true, clientId: true },
    });
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
      clientId: account.clientId!,
    };
  };

  const staffPrincipal = async (
    email: string,
  ): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: {
        id: true,
        staffMember: {
          select: {
            id: true,
            role: true,
            branchAssignments: { select: { branchId: true } },
          },
        },
      },
    });
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: {
        kind: 'staff',
        staffMemberId: account.staffMember!.id,
        role: account.staffMember!.role.toLowerCase() as 'administrator',
        branchIds: account.staffMember!.branchAssignments.map(
          (a) => a.branchId,
        ),
      },
    };
  };

  const newClient = async (name: string) => {
    const account = await prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        activatedAt: now,
        emailVerifiedAt: now,
        client: { create: { name, referralCode: randomUUID().slice(0, 8) } },
      },
      select: { id: true, clientId: true },
    });
    const principal: AuthenticatedPrincipal & { clientId: string } = {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity: { kind: 'client', clientId: account.clientId! },
      clientId: account.clientId!,
    };
    return principal;
  };

  const readyReceipt = async (
    ownerAccountId: string,
    state: 'READY' | 'PENDING' = 'READY',
  ) =>
    prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose: 'TRANSFER_RECEIPT',
        state,
        pendingObjectKey: `pending/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1_000),
        finalizedAt: state === 'READY' ? now : null,
        deletionDueAt: new Date(now.getTime() + hour),
      },
      select: { id: true },
    });

  // Gives `referrerClientId` Bs 60 of Credit the way a cash purchase by a
  // brand-new referred Client would leave the ledger.
  const seedAward = async (referrerClientId: string) => {
    const referred = await newClient('Referida');
    const admin = await prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      select: { id: true },
    });
    await prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.create({
        data: {
          clientId: referred.clientId,
          planId: plan.id,
          planNameSnapshot: plan.name,
          durationMonthsSnapshot: plan.durationMonths,
          classAllowanceSnapshot: plan.classAllowance,
          planPriceCentavos: plan.priceCentavos,
          creditAppliedCentavos: 0,
          amountDueCentavos: plan.priceCentavos,
          method: 'CASH',
          state: 'CONFIRMED',
          collectedAtBranchId: fixtures.branches[0].id,
          submittedByAccountId: admin.id,
          submittedAt: now,
          decidedByAccountId: admin.id,
          decidedAt: now,
          createdAt: now,
        },
      });
      await transaction.subscription.create({
        data: {
          clientId: referred.clientId,
          planId: plan.id,
          paymentId: payment.id,
          planNameSnapshot: plan.name,
          durationMonthsSnapshot: plan.durationMonths,
          originalClassAllowance: plan.classAllowance,
          remainingClassAllowance: plan.classAllowance,
          startsOn: today,
          endsOn: new Date('2026-10-21T00:00:00.000Z'),
          activatedAt: now,
        },
      });
      const referral = await transaction.referral.create({
        data: {
          referrerClientId,
          referredClientId: referred.clientId,
          createdAt: now,
          state: 'AWARDED',
          qualifiedPaymentId: payment.id,
          qualifiedAt: now,
          awardCentavos: 6000,
          awardedAt: now,
        },
      });
      await transaction.creditLedgerEntry.create({
        data: {
          clientId: referrerClientId,
          kind: 'REFERRAL_AWARD',
          amountCentavos: 6000,
          referralId: referral.id,
          actorKind: 'WORKER',
          correlationId: randomUUID(),
        },
      });
    });
  };

  const codeOf = async (work: Promise<unknown>): Promise<string> => {
    try {
      await work;
      return 'resolved';
    } catch (error) {
      if (error instanceof PaymentRuleError) return error.code;
      if (error instanceof BookingAccessDeniedError) return 'access_denied';
      return String(error);
    }
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
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
      amountDueCentavos: 56_000,
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

  it('confirms a transfer: activates the Subscription, spends Credit, awards the Referral, audits, and notifies', async () => {
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
      creditReservedCentavos: 6000,
      amountDueCentavos: 50_000,
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
      originalClassAllowance: 8,
      remainingClassAllowance: 8,
      startsOn: today,
      endsOn: new Date('2026-10-21T00:00:00.000Z'),
      state: 'ACTIVE',
    });
    await expect(commands().readCreditSummary(buyer)).resolves.toEqual({
      availableCentavos: 0,
      reservedCentavos: 0,
    });
    await expect(
      prisma.creditReservation.findUniqueOrThrow({
        where: { purchaseIntentId: intent.id },
      }),
    ).resolves.toMatchObject({ state: 'SPENT', settledAt: decidedAt });
    await expect(
      prisma.referral.findUniqueOrThrow({
        where: { referredClientId: buyer.clientId },
      }),
    ).resolves.toMatchObject({
      state: 'AWARDED',
      qualifiedPaymentId: pending.id,
      awardCentavos: 6000,
    });
    await expect(commands().readCreditSummary(referrer)).resolves.toEqual({
      availableCentavos: 6000,
      reservedCentavos: 0,
    });
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

  it('rejects a transfer with a trimmed reason, releases Credit, and lets the Client start again', async () => {
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
    await expect(commands().readCreditSummary(buyer)).resolves.toEqual({
      availableCentavos: 6000,
      reservedCentavos: 0,
    });
    await expect(
      prisma.creditReservation.findUniqueOrThrow({
        where: { purchaseIntentId: intent.id },
      }),
    ).resolves.toMatchObject({ state: 'RELEASED' });
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
    ).resolves.toMatchObject({ state: 'open', creditReservedCentavos: 6000 });
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
