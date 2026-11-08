import { randomUUID } from 'node:crypto';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  fixtures,
  now,
  plan,
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

const day = 24 * 60 * 60 * 1_000;
const civil = (date: Date) => date.toISOString().slice(0, 10);

// FIX-052 (walkthrough n.º 47): Revisar pago says when the transfer is for the
// Client's next Plan, queued after the one she still has.
describe('payment review next Plan (PostgreSQL)', () => {
  let world: PaymentWorld;
  let administrator: AuthenticatedPrincipal;
  let assistant: AuthenticatedPrincipal;

  beforeAll(async () => {
    world = await startPaymentWorld();
    administrator = await world.staffPrincipal('paola.mendoza@example.com');
    assistant = await world.staffPrincipal('camila.rojas@example.com');
  });

  afterAll(async () => {
    await world?.stop();
  });

  const transfer = async (buyer: AuthenticatedPrincipal, startsOn?: string) => {
    const receipt = await world.readyReceipt(buyer.accountId);
    const intent = await world
      .commands()
      .createPurchaseIntent({ planId: plan.id, startsOn }, buyer, randomUUID());
    await world
      .commands()
      .attachReceipt(
        { purchaseIntentId: intent.id, imageAssetId: receipt.id },
        buyer,
        randomUUID(),
      );
    return world
      .commands()
      .submitTransfer(
        { purchaseIntentId: intent.id, invoiceData: null },
        buyer,
        randomUUID(),
      );
  };

  const review = (paymentId: string, at: Date = now) =>
    world.commands(at).readPaymentReview({ paymentId }, administrator);

  it('marks a transfer queued after the current Plan as the next Plan, before and after confirming', async () => {
    const buyer = await world.newClient('Rocío Siguiente');
    const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
    const sale = await world
      .commands()
      .recordCashPayment(
        { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
        assistant,
        randomUUID(),
      );
    const current = await world.prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const nextStart = civil(new Date(current.endsOn.getTime() + day));

    const payment = await transfer(buyer);

    await expect(review(payment.id)).resolves.toMatchObject({
      state: 'pending',
      startsOn: nextStart,
      nextPlan: true,
    });
    await world
      .commands()
      .confirmTransfer({ paymentId: payment.id }, administrator);
    await expect(review(payment.id)).resolves.toMatchObject({
      state: 'confirmed',
      startsOn: nextStart,
      nextPlan: true,
    });
  });

  it('does not mark a rejected transfer, which will never start', async () => {
    const buyer = await world.newClient('Rechazada Siguiente');
    const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
    await world
      .commands()
      .recordCashPayment(
        { clientId: buyer.clientId, planId: plan.id, branchId: centro.id },
        assistant,
        randomUUID(),
      );
    const payment = await transfer(buyer);
    await world
      .commands()
      .rejectTransfer(
        { paymentId: payment.id, reason: 'El monto no coincide.' },
        administrator,
      );

    await expect(review(payment.id)).resolves.toMatchObject({
      state: 'rejected',
      kind: 'plan',
      nextPlan: false,
    });
  });

  it('does not mark a first Plan, even one bought for a later Start Date', async () => {
    const first = await world.newClient('Primera Compra');
    const later = await world.newClient('Compra Adelantada');
    const laterStart = civil(new Date(now.getTime() + 5 * day));

    const plain = await transfer(first);
    const scheduled = await transfer(later, laterStart);

    await expect(review(plain.id)).resolves.toMatchObject({ nextPlan: false });
    await expect(review(scheduled.id)).resolves.toMatchObject({
      startsOn: laterStart,
      nextPlan: false,
    });
  });
});
