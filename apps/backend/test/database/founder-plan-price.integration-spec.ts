import { randomUUID } from 'node:crypto';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { priceFounderPlanList } from '../../src/booking/payments/prisma-founder-membership';
import { readCurrentStudioSettings } from '../../src/booking/studio-settings/prisma-studio-settings';
import {
  fixtures,
  now,
  plan,
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

// Decision 1: the first Plan is already priced as a founder Plan, so the
// list the Client and the Assistant read shows that price before she buys.
describe('founder plan list price', () => {
  let world: PaymentWorld;

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const pricesFor = async (email: string) => {
    const account = await world.prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: { clientId: true },
    });
    const plans = await createCatalogRepository(
      world.prisma,
    ).listVisiblePlans();
    const priced = await priceFounderPlanList(
      world.prisma,
      account.clientId,
      plans,
    );
    return priced.find((item) => item.id === plan.id);
  };

  it('shows the founder price to a Client who has not bought, and the list price once the 40 places are taken', async () => {
    const eight = await pricesFor('mariana@example.com');
    expect(eight).toMatchObject({
      priceCentavos: 47_600,
      listPriceCentavos: 56_000,
    });

    const author = await world.prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      select: { id: true },
    });
    const current = await readCurrentStudioSettings(world.prisma);
    await world.prisma.studioSettingsVersion.create({
      data: {
        ...current,
        version: current.version + 1,
        founderPlaces: 0,
        openingDate: null,
        createdByAccountId: author.id,
      },
    });
    const full = await pricesFor('sofia@example.com');
    expect(full).toMatchObject({ priceCentavos: 56_000 });
    expect(full?.listPriceCentavos).toBeUndefined();
  });

  it('shows the list price to a Client who already bought a plan', async () => {
    const buyer = await world.newClient('Ya compró');
    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    await world.commands().recordCashPayment(
      {
        clientId: buyer.clientId,
        planId: plan.id,
        branchId: centro.id,
      },
      assistant,
      randomUUID(),
    );
    await world.prisma.subscription.updateMany({
      where: { clientId: buyer.clientId },
      data: { state: 'EXPIRED', expiredAt: now },
    });
    const account = await world.prisma.account.findFirstOrThrow({
      where: { clientId: buyer.clientId, deletedAt: null },
      select: { email: true },
    });

    const priced = await pricesFor(account.email);
    expect(priced).toMatchObject({ priceCentavos: 56_000 });
    expect(priced?.listPriceCentavos).toBeUndefined();
  });

  // FIX-025: Bs 1050 − 15 % is Bs 892,50; the list, the stored sale, and so
  // the cash close all say Bs 893.
  it('rounds the founder price to a whole boliviano in the list and in the stored cash sale', async () => {
    const monthly = fixtures.plans.find(
      (item) => item.name === 'Mensual 16 clases',
    )!;
    // The first spec took every place; give them back.
    const author = await world.prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      select: { id: true },
    });
    const current = await readCurrentStudioSettings(world.prisma);
    await world.prisma.studioSettingsVersion.create({
      data: {
        ...current,
        version: current.version + 1,
        founderPlaces: 40,
        createdByAccountId: author.id,
      },
    });
    const buyer = await world.newClient('Paga en enteros');
    const account = await world.prisma.account.findFirstOrThrow({
      where: { clientId: buyer.clientId, deletedAt: null },
      select: { clientId: true },
    });
    const plans = await createCatalogRepository(
      world.prisma,
    ).listVisiblePlans();
    const listed = (
      await priceFounderPlanList(world.prisma, account.clientId, plans)
    ).find((item) => item.id === monthly.id);
    expect(listed).toMatchObject({
      priceCentavos: 89_300,
      listPriceCentavos: 105_000,
    });

    const assistant = await world.staffPrincipal('camila.rojas@example.com');
    const centro = fixtures.branches.find(
      (branch) => branch.name === 'Centro',
    )!;
    const sale = await world
      .commands()
      .recordCashPayment(
        { clientId: buyer.clientId, planId: monthly.id, branchId: centro.id },
        assistant,
        randomUUID(),
      );
    expect(sale).toMatchObject({
      planPriceCentavos: 105_000,
      discountCentavos: 15_700,
      amountDueCentavos: 89_300,
    });
  });

  // The iPad showed Bs 560 for a renewing founder and charged Bs 476. The
  // quote and the cash sale must agree for every founder state.
  const buyEight = (clientId: string) =>
    world.staffPrincipal('camila.rojas@example.com').then((assistant) =>
      world.commands().recordCashPayment(
        {
          clientId,
          planId: plan.id,
          branchId: fixtures.branches.find(
            (branch) => branch.name === 'Centro',
          )!.id,
        },
        assistant,
        randomUUID(),
      ),
    );

  const quoteEight = async (clientId: string) =>
    (
      await priceFounderPlanList(
        world.prisma,
        clientId,
        await createCatalogRepository(world.prisma).listVisiblePlans(),
        now,
      )
    ).find((item) => item.id === plan.id);

  it('quotes and charges the founder price on an active founder renewal', async () => {
    const founder = await world.newClient('Renueva fundadora');
    await buyEight(founder.clientId);

    const quoted = await quoteEight(founder.clientId);
    expect(quoted).toMatchObject({
      priceCentavos: 47_600,
      listPriceCentavos: 56_000,
    });
    const renewal = await buyEight(founder.clientId);
    expect(renewal.amountDueCentavos).toBe(quoted?.priceCentavos);
  });

  it('quotes and charges the list price to a founder who lost the benefit', async () => {
    const lost = await world.newClient('Perdió fundadora');
    await buyEight(lost.clientId);
    await world.prisma.founderMembership.updateMany({
      where: { clientId: lost.clientId },
      data: { status: 'LOST', reason: 'gap', lostAt: now },
    });

    const quoted = await quoteEight(lost.clientId);
    expect(quoted).toMatchObject({ priceCentavos: 56_000 });
    expect(quoted?.listPriceCentavos).toBeUndefined();
    const sale = await buyEight(lost.clientId);
    expect(sale.amountDueCentavos).toBe(quoted?.priceCentavos);
  });

  it('quotes the list price to a founder whose gap already passed 7 days, as the sale charges', async () => {
    const lapsed = await world.newClient('Se pasó del plazo');
    await buyEight(lapsed.clientId);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1_000);
    await world.prisma.subscription.updateMany({
      where: { clientId: lapsed.clientId },
      data: {
        startsOn: new Date(tenDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1_000),
        endsOn: tenDaysAgo,
        state: 'EXPIRED',
        expiredAt: tenDaysAgo,
      },
    });

    const quoted = await quoteEight(lapsed.clientId);
    expect(quoted).toMatchObject({ priceCentavos: 56_000 });
    const sale = await buyEight(lapsed.clientId);
    expect(sale.amountDueCentavos).toBe(quoted?.priceCentavos);
  });
});
