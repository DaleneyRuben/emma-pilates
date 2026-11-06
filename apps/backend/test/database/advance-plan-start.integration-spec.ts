import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createFounderMembershipJob } from '../../src/booking/payments/founder-membership-job';
import { createPrismaPaymentCommands } from '../../src/booking/payments/prisma-payment-commands';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import {
  codeOf,
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const quarterly = fixtures.plans.find(
  (item) => item.name === 'Trimestral 36 clases',
)!;

const day = 24 * 60 * 60 * 1_000;
const civil = (date: Date): string => date.toISOString().slice(0, 10);
const after = (date: Date, days: number): string =>
  civil(new Date(date.getTime() + days * day));

// booking ADR-0013: with a Plan in force, the next one chooses a Start Date
// from the day after the current end through 28 days after it, and a Plan
// bought in advance keeps the Founder place inside that window.
describe('next Plan start window and the Founder place (PostgreSQL)', () => {
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
  const assistant = () => world.staffPrincipal('camila.rojas@example.com');

  const releasePlaces = () =>
    prisma.founderMembership.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: now },
    });

  const cash = async (clientId: string, startsOn?: string) =>
    world.commands().recordCashPayment(
      {
        clientId,
        planId: plan.id,
        branchId: centro().id,
        ...(startsOn === undefined ? {} : { startsOn }),
      },
      await assistant(),
      randomUUID(),
    );

  const founderWithPlan = async (name: string) => {
    await releasePlaces();
    const client = await world.newClient(name);
    await cash(client.clientId);
    const current = await prisma.subscription.findFirstOrThrow({
      where: { clientId: client.clientId },
    });
    await expect(
      prisma.founderMembership.findFirstOrThrow({
        where: { clientId: client.clientId, deletedAt: null },
      }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    return { client, current };
  };

  const membershipOf = (clientId: string) =>
    prisma.founderMembership.findFirstOrThrow({
      where: { clientId, deletedAt: null },
    });

  it('starts a cash renewal on the chosen day inside the window and keeps the founder price', async () => {
    const { client, current } = await founderWithPlan('Adelantada efectivo');

    const sale = await cash(client.clientId, after(current.endsOn, 20));

    const next = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    expect(civil(next.startsOn)).toBe(after(current.endsOn, 20));
    expect(sale).toMatchObject({ discountReason: 'founder' });
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: current.id } }),
    ).resolves.toMatchObject({ endsOn: current.endsOn });
    await expect(membershipOf(client.clientId)).resolves.toMatchObject({
      status: 'ACTIVE',
    });
  });

  it('accepts the last day of the window, 28 days after the end', async () => {
    const { client, current } = await founderWithPlan('Último día');

    const sale = await cash(client.clientId, after(current.endsOn, 28));

    const next = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    expect(civil(next.startsOn)).toBe(after(current.endsOn, 28));
  });

  it('refuses a day past the window', async () => {
    const { client, current } = await founderWithPlan('Fuera de ventana');

    await expect(
      codeOf(cash(client.clientId, after(current.endsOn, 29))),
    ).resolves.toBe('start_date_out_of_window');
  });

  it('keeps the founder place when a transfer bought in advance is confirmed', async () => {
    const { client, current } = await founderWithPlan('Adelantada QR');
    const staff = await assistant();
    const receipt = await world.readyReceipt(staff.accountId);

    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: client.clientId,
        planId: plan.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
        startsOn: after(current.endsOn, 15),
      },
      staff,
      randomUUID(),
    );
    expect(pending).toMatchObject({ discountReason: 'founder' });
    await world
      .commands()
      .confirmTransfer(
        { paymentId: pending.id },
        await world.staffPrincipal('paola.mendoza@example.com'),
      );

    const next = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: pending.id },
    });
    expect(civil(next.startsOn)).toBe(after(current.endsOn, 15));
    await expect(membershipOf(client.clientId)).resolves.toMatchObject({
      status: 'ACTIVE',
    });
  });

  it('keeps the place through the nightly job while the advance Plan has not started', async () => {
    const { client, current } = await founderWithPlan('Adelantada noche');
    await cash(client.clientId, after(current.endsOn, 25));

    const job = createFounderMembershipJob(
      prisma,
      () => new Date(`${after(current.endsOn, 12)}T15:00:00.000Z`),
    );
    await job.execute();

    await expect(membershipOf(client.clientId)).resolves.toMatchObject({
      status: 'ACTIVE',
    });
  });

  // Review fix 1: the current Plan running out of classes after the sale
  // must not make an advance transfer unconfirmable.
  it('confirms an advance transfer after the current Plan has used its classes', async () => {
    const { client, current } = await founderWithPlan('Sin clases después');
    const staff = await assistant();
    const receipt = await world.readyReceipt(staff.accountId);
    const pending = await world.commands().recordFrontDeskTransfer(
      {
        clientId: client.clientId,
        planId: plan.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
        startsOn: after(current.endsOn, 25),
      },
      staff,
      randomUUID(),
    );
    await prisma.subscription.update({
      where: { id: current.id },
      data: { remainingClassAllowance: 0 },
    });

    await world
      .commands()
      .confirmTransfer(
        { paymentId: pending.id },
        await world.staffPrincipal('paola.mendoza@example.com'),
      );

    const next = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: pending.id },
    });
    expect(civil(next.startsOn)).toBe(after(current.endsOn, 25));
    await expect(
      prisma.subscription.findUniqueOrThrow({ where: { id: current.id } }),
    ).resolves.toMatchObject({ endsOn: current.endsOn });
  });

  // Review fix 3: the Client's own transfer is sold when she commits to the
  // Purchase Intent, not when the receipt arrives the next day.
  it('judges the founder place on the purchase intent day', async () => {
    const { client, current } = await founderWithPlan(
      'Intención el último día',
    );
    const endDay = civil(current.endsOn);
    const intentAt = new Date(`${endDay}T20:00:00.000Z`);
    const submitAt = new Date(`${after(current.endsOn, 1)}T13:00:00.000Z`);
    const intent = await createPrismaPaymentCommands(prisma, {
      now: () => intentAt,
    }).createPurchaseIntent(
      { planId: plan.id, startsOn: after(current.endsOn, 15) },
      client,
      randomUUID(),
    );
    const receipt = await prisma.imageAsset.create({
      data: {
        ownerAccountId: client.accountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: `pending/${randomUUID()}`,
        declaredMediaType: 'JPEG',
        declaredByteSize: 1234,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
        createdAt: submitAt,
        expiresAt: new Date(submitAt.getTime() + 15 * 60 * 1_000),
        finalizedAt: submitAt,
      },
      select: { id: true },
    });
    const later = createPrismaPaymentCommands(prisma, { now: () => submitAt });
    await later.attachReceipt(
      { purchaseIntentId: intent.id, imageAssetId: receipt.id },
      client,
      randomUUID(),
    );
    const payment = await later.submitTransfer(
      { purchaseIntentId: intent.id },
      client,
      randomUUID(),
    );

    await later.confirmTransfer(
      { paymentId: payment.id },
      await world.staffPrincipal('paola.mendoza@example.com'),
    );
    await createFounderMembershipJob(
      prisma,
      () => new Date(`${after(current.endsOn, 10)}T15:00:00.000Z`),
    ).execute();

    await expect(membershipOf(client.clientId)).resolves.toMatchObject({
      status: 'ACTIVE',
    });
  });

  // booking ADR-0013 review fix 2: a pending advance transfer caps the
  // Freeze as a queued Subscription does, or it could not be confirmed.
  it('refuses a Freeze whose extension would reach a pending next Plan', async () => {
    const client = await world.newClient('Congelada con QR pendiente');
    const sale = await world.commands().recordCashPayment(
      {
        clientId: client.clientId,
        planId: quarterly.id,
        branchId: centro().id,
      },
      await assistant(),
      randomUUID(),
    );
    const subscription = await prisma.subscription.findFirstOrThrow({
      where: { paymentId: sale.id },
    });
    const staff = await assistant();
    const receipt = await world.readyReceipt(staff.accountId);
    const nextStart = new Date(subscription.endsOn.getTime() + 5 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await world.commands().recordFrontDeskTransfer(
      {
        clientId: client.clientId,
        planId: quarterly.id,
        branchId: centro().id,
        imageAssetId: receipt.id,
        startsOn: nextStart,
      },
      staff,
      randomUUID(),
    );

    await expect(
      codeOf(
        createPrismaPaymentCommands(prisma, { now: () => now }).requestFreeze(
          {
            subscriptionId: subscription.id,
            startsOn: '2026-10-01',
            endsOn: '2026-10-10',
            reason: 'Viaje',
          },
          client,
        ),
      ),
    ).resolves.toBe('freeze_not_allowed');
  });
});
