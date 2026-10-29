import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const hour = 60 * 60 * 1_000;

// A place reserved at pricing must come back when the sale does not finish,
// or an unpaid intent can hold place 40 for good.
describe('founder place release', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const centro = () =>
    fixtures.branches.find((branch) => branch.name === 'Centro')!;

  const releasePlaces = () =>
    prisma.founderMembership.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: now },
    });

  const reservedPlace = (clientId: string) =>
    prisma.founderMembership.findFirst({
      where: { clientId, status: 'RESERVED', deletedAt: null },
    });

  const nextBuyerTakesThePlace = async () => {
    const next = await world.newClient('Lugar liberado');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    await world
      .commands()
      .recordCashPayment(
        { clientId: next.clientId, planId: plan.id, branchId: centro().id },
        assistant,
        randomUUID(),
      );
    await expect(
      prisma.founderMembership.findFirst({
        where: { clientId: next.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
  };

  it('frees the reserved place when the purchase intent expires', async () => {
    await releasePlaces();
    const buyer = await world.newClient('Intención vencida');

    const intent = await world
      .commands()
      .createPurchaseIntent({ planId: plan.id }, buyer, randomUUID());
    await expect(reservedPlace(buyer.clientId)).resolves.toMatchObject({
      status: 'RESERVED',
    });

    const later = new Date(now.getTime() + 25 * hour);
    await world.commands(later).expirePurchaseIntents();

    await expect(reservedPlace(buyer.clientId)).resolves.toBeNull();
    await expect(
      prisma.purchaseIntent.findUniqueOrThrow({ where: { id: intent.id } }),
    ).resolves.toMatchObject({ state: 'EXPIRED' });
    await nextBuyerTakesThePlace();
  });

  it('frees the reserved place when the transfer is rejected', async () => {
    await releasePlaces();
    const buyer = await world.newClient('Comprobante rechazado');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
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
    await expect(reservedPlace(buyer.clientId)).resolves.toMatchObject({
      status: 'RESERVED',
    });

    await world
      .commands()
      .rejectTransfer(
        { paymentId: pending.id, reason: 'El monto no coincide' },
        await world.staffPrincipal('paola.mendoza@example.com'),
      );

    await expect(reservedPlace(buyer.clientId)).resolves.toBeNull();
    await nextBuyerTakesThePlace();
  });

  it('keeps the place with the front desk QR when an older intent expires', async () => {
    await releasePlaces();
    const buyer = await world.newClient('Intención vieja y QR');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const receipt = await world.readyReceipt(assistant.accountId);

    await world
      .commands()
      .createPurchaseIntent({ planId: plan.id }, buyer, randomUUID());
    const later = new Date(now.getTime() + 25 * hour);
    const qr = await world.commands(later).recordFrontDeskTransfer(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
      },
      assistant,
      randomUUID(),
    );
    await expect(reservedPlace(buyer.clientId)).resolves.toMatchObject({
      status: 'RESERVED',
      paymentId: qr.id,
    });

    await world.commands(later).expirePurchaseIntents();

    await expect(reservedPlace(buyer.clientId)).resolves.toMatchObject({
      status: 'RESERVED',
      paymentId: qr.id,
    });
    await world
      .commands(later)
      .confirmTransfer(
        { paymentId: qr.id },
        await world.staffPrincipal('paola.mendoza@example.com'),
      );
    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: buyer.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE', paymentId: qr.id });
  });

  it('does not make a founder of a renewal after her first plan missed the places', async () => {
    await releasePlaces();
    const holders = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        world.newClient(`Cupo ${index + 1}`),
      ),
    );
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    for (const holder of holders) {
      await world.commands().recordCashPayment(
        {
          clientId: holder.clientId,
          planId: plan.id,
          branchId: centro().id,
        },
        assistant,
        randomUUID(),
      );
    }
    const late = await world.newClient('Llegó tarde');
    const first = await world
      .commands()
      .recordCashPayment(
        { clientId: late.clientId, planId: plan.id, branchId: centro().id },
        assistant,
        randomUUID(),
      );
    expect(first).toMatchObject({ discountReason: null });

    await prisma.founderMembership.updateMany({
      where: { clientId: holders[0].clientId },
      data: { deletedAt: now },
    });
    await prisma.subscription.updateMany({
      where: { clientId: late.clientId },
      data: { state: 'EXPIRED', expiredAt: now },
    });

    const renewal = await world
      .commands()
      .recordCashPayment(
        { clientId: late.clientId, planId: plan.id, branchId: centro().id },
        assistant,
        randomUUID(),
      );
    expect(renewal).toMatchObject({ discountReason: null });
    await expect(
      prisma.founderMembership.findFirst({
        where: { clientId: late.clientId, deletedAt: null },
      }),
    ).resolves.toBeNull();
  });
});
