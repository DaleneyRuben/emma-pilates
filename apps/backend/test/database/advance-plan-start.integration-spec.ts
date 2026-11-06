import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createFounderMembershipJob } from '../../src/booking/payments/founder-membership-job';
import {
  codeOf,
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

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
});
