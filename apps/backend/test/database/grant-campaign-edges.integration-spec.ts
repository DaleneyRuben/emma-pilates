import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaCampaignGrant } from '../../src/booking/payments/prisma-campaign-grant';
import { createPrismaCourtesyAccess } from '../../src/booking/payments/prisma-courtesy-access';
import { createPrismaVoidPayment } from '../../src/booking/payments/prisma-void-payment';
import { auditActorOf } from '../../src/system-identity/authentication/audit-actor';
import {
  fixtures,
  now,
  PaymentWorld,
  plan,
  startPaymentWorld,
} from './payment-lifecycle-test-support';

const day = 24 * 60 * 60 * 1_000;

// FIX-064 review: where a campaign's classes land in the edge cases.
describe('campaign classes at the edges', () => {
  let world: PaymentWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startPaymentWorld();
    ({ prisma } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  const administrator = () => world.staffPrincipal('paola.mendoza@example.com');

  const cash = async (clientId: string, startsOn?: string) =>
    world.commands().recordCashPayment(
      {
        clientId,
        planId: plan.id,
        branchId: fixtures.branches.find((branch) => branch.name === 'Centro')!
          .id,
        ...(startsOn === undefined ? {} : { startsOn }),
      },
      await world.staffPrincipal('camila.rojas@example.com'),
      randomUUID(),
    );

  const campaign = async () =>
    createPrismaCampaignGrant(prisma, () => now).grant(
      { name: 'Vacaciones', classes: 1, idempotencyKey: randomUUID() },
      await administrator(),
    );

  const campaignAdjustments = (clientId: string) =>
    prisma.allowanceAdjustment.findMany({
      where: { clientId, reason: 'CAMPAIGN', deletedAt: null },
      select: { subscriptionId: true },
    });

  it('owes the classes again when the sale that collected them is voided', async () => {
    const client = await world.newClient('Venta anulada');
    await campaign();
    const sale = await cash(client.clientId);
    await expect(campaignAdjustments(client.clientId)).resolves.toHaveLength(1);

    await createPrismaVoidPayment(prisma).voidPayment({
      paymentId: sale.id,
      reason: 'Venta registrada por error',
      actor: auditActorOf(await administrator()),
      now,
    });

    await expect(campaignAdjustments(client.clientId)).resolves.toEqual([]);
    await expect(
      prisma.owedCampaignClass.findFirstOrThrow({
        where: { clientId: client.clientId, deletedAt: null },
        select: { collectedAt: true, allowanceAdjustmentId: true },
      }),
    ).resolves.toEqual({ collectedAt: null, allowanceAdjustmentId: null });
    const next = await cash(client.clientId);
    await expect(campaignAdjustments(client.clientId)).resolves.toEqual([
      { subscriptionId: next.subscriptionId },
    ]);
  });

  it('gives the classes to a Plan that starts later instead of owing them', async () => {
    const client = await world.newClient('Empieza luego');
    const sale = await cash(
      client.clientId,
      new Date(now.getTime() + 3 * day).toISOString().slice(0, 10),
    );

    const result = await campaign();

    expect(result.granted).toContainEqual({
      clientId: client.clientId,
      name: 'Empieza luego',
    });
    await expect(campaignAdjustments(client.clientId)).resolves.toEqual([
      { subscriptionId: sale.subscriptionId },
    ]);
  });

  it('leaves out a disabled or removed Account', async () => {
    const disabled = await world.newClient('Cuenta desactivada');
    await prisma.account.updateMany({
      where: { clientId: disabled.clientId },
      data: { disabledAt: now },
    });
    const removed = await world.newClient('Cuenta borrada');
    await prisma.account.updateMany({
      where: { clientId: removed.clientId },
      data: { deletedAt: now },
    });

    const result = await campaign();

    const reached = [...result.granted, ...result.owed].map(
      (client) => client.clientId,
    );
    expect(reached).not.toContain(disabled.clientId);
    expect(reached).not.toContain(removed.clientId);
  });

  it('collects owed classes onto a Courtesy Access', async () => {
    const client = await world.newClient('Cortesía');
    await campaign();

    await createPrismaCourtesyAccess(prisma, { now: () => now }).grant(
      { clientId: client.clientId, endsOn: new Date(now.getTime() + 30 * day) },
      await administrator(),
      randomUUID(),
    );

    await expect(campaignAdjustments(client.clientId)).resolves.toHaveLength(1);
  });
});
