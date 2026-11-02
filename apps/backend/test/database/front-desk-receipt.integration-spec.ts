import { randomUUID } from 'node:crypto';
import { PaymentState } from '../../src/generated/prisma/client';
import {
  codeOf,
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';
import { impersonating, openImpersonation } from './impersonation-test-support';

describe('a front-desk transfer receipt', () => {
  let world: PaymentWorld;

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('stays pending until the Administrator approves it on the existing review', async () => {
    const buyer = await world.newClient('Recepción QR');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const administrator = await world.staffPrincipal(
      'paola.mendoza@example.com',
    );
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    const receipt = await world.readyReceipt(assistant.accountId);

    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro.id,
        imageAssetId: receipt.id,
      },
      assistant,
      randomUUID(),
    );

    expect(pending.state).toBe('pending');
    expect(pending.method).toBe('transfer');
    await expect(
      world.prisma.subscription.findUnique({
        where: { paymentId: pending.id },
      }),
    ).resolves.toBeNull();
    const review = await world
      .commands()
      .readPaymentReview({ paymentId: pending.id }, administrator);
    expect(review.receipt).toMatchObject({ imageAssetId: receipt.id });
    const notices = await world.prisma.notification.findMany({
      where: { type: 'payment_submitted' },
    });
    expect(
      notices.some((notice) => notice.message.includes('comprobante')),
    ).toBe(true);

    const confirmed = await world
      .commands()
      .confirmTransfer({ paymentId: pending.id }, administrator);
    expect(confirmed.state).toBe('confirmed');
    await expect(
      world.prisma.payment.findUniqueOrThrow({ where: { id: pending.id } }),
    ).resolves.toMatchObject({ state: PaymentState.CONFIRMED });
    await expect(
      world.prisma.subscription.findUnique({
        where: { paymentId: pending.id },
      }),
    ).resolves.not.toBeNull();
  });

  // FIX-010 / ADR-0100: the audit names the Administrator who sees the app as
  // the Assistant, with her Role and the Impersonation.
  it('audits a transfer taken while an Administrator sees the app as the Assistant', async () => {
    const buyer = await world.newClient('Recepción suplantada');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const paola = await world.staffPrincipal('paola.mendoza@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    const impersonation = await openImpersonation(world.prisma, {
      administratorAccountId: paola.accountId,
      staffMemberId: (assistant.identity as { staffMemberId: string })
        .staffMemberId,
      now,
    });
    const receipt = await world.readyReceipt(assistant.accountId);

    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro.id,
        imageAssetId: receipt.id,
      },
      impersonating(assistant, impersonation),
      randomUUID(),
    );

    await expect(
      world.prisma.auditRecord.findFirstOrThrow({
        where: {
          actionCode: 'payment.front_desk_transfer_submitted',
          targetId: pending.id,
        },
        select: {
          actorAccountId: true,
          actorRole: true,
          impersonationId: true,
        },
      }),
    ).resolves.toEqual({
      actorAccountId: paola.accountId,
      actorRole: 'ADMINISTRATOR',
      impersonationId: impersonation.id,
    });
  });

  it('still confirms cash on the spot, with no receipt', async () => {
    const buyer = await world.newClient('Recepción efectivo');
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

    expect(payment).toMatchObject({ method: 'cash', state: 'confirmed' });
    expect(payment.decidedAt?.toISOString()).toBe(now.toISOString());
  });

  // FIX-028 (walkthrough note 21): after the receipt is sent, «Confirmar pago
  // recibido» must not record the same sale again in cash, for that Plan or
  // any other, until the Administrator decides the transfer.
  it('refuses a cash sale while her front-desk transfer is pending', async () => {
    const buyer = await world.newClient('Recepción doble cobro');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    const other = fixtures.plans.find((item) => item.id !== plan.id)!;
    const receipt = await world.readyReceipt(assistant.accountId);
    await world.commands().recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro.id,
        imageAssetId: receipt.id,
      },
      assistant,
      randomUUID(),
    );

    for (const planId of [plan.id, other.id]) {
      await expect(
        codeOf(
          world
            .commands()
            .recordCashPayment(
              { clientId: buyer.clientId, planId, branchId: centro.id },
              assistant,
              randomUUID(),
            ),
        ),
      ).resolves.toBe('payment_pending_exists');
    }
    await expect(
      world.prisma.payment.count({
        where: { clientId: buyer.clientId, method: 'CASH' },
      }),
    ).resolves.toBe(0);
  });
});
