import { randomUUID } from 'node:crypto';
import {
  hour,
  now,
  plan,
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

// Walkthrough n.º 12: after a receipt was approved, the Staff app still
// listed «Tienes un comprobante de pago pendiente de revisión.» as if it
// waited. The decision must mark that notice read on every Administrator's
// bell, not only on the bell of whoever approved it.
describe('the receipt review notice settles for every Administrator', () => {
  let world: PaymentWorld;

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const secondAdministrator = async () => {
    const staffMember = await world.prisma.staffMember.create({
      data: { name: 'Gabriela Segunda', role: 'ADMINISTRATOR' },
      select: { id: true },
    });
    return world.prisma.account.create({
      data: {
        email: `${randomUUID()}@example.com`,
        staffMemberId: staffMember.id,
        activatedAt: new Date(now.getTime() - 24 * hour),
      },
      select: { id: true },
    });
  };

  it('marks the notice read for each Administrator when one approves', async () => {
    const other = await secondAdministrator();
    const buyer = await world.newClient('Revisada');
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
    const pending = await world
      .commands()
      .submitTransfer({ purchaseIntentId: intent.id }, buyer, randomUUID());
    const key = `payment-submitted:${pending.id}`;
    const notices = () =>
      world.prisma.notification.findMany({
        where: { businessEventKey: key, deletedAt: null },
        select: { accountId: true, readAt: true },
      });
    const before = await notices();
    expect(before.length).toBeGreaterThanOrEqual(2);
    expect(before).toEqual(
      expect.arrayContaining([{ accountId: other.id, readAt: null }]),
    );

    const decidedAt = new Date(now.getTime() + hour);
    const approver = await world.staffPrincipal('paola.mendoza@example.com');
    await world
      .commands(decidedAt)
      .confirmTransfer({ paymentId: pending.id }, approver);

    const after = await notices();
    expect(after).toHaveLength(before.length);
    expect(
      after.every(({ readAt }) => readAt?.getTime() === decidedAt.getTime()),
    ).toBe(true);
  });
});
