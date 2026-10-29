import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { priceFounderPlanList } from '../../src/booking/payments/prisma-founder-membership';
import { readCurrentStudioSettings } from '../../src/booking/studio-settings/prisma-studio-settings';
import {
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
});
