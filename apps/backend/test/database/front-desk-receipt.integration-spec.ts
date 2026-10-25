import { randomUUID } from 'node:crypto';
import { PaymentState } from '../../src/generated/prisma/client';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

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
});
