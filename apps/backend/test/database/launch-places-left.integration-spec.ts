import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { priceFounderPlanList } from '../../src/booking/payments/founder-plan-quote';
import { readCurrentStudioSettings } from '../../src/booking/studio-settings/prisma-studio-settings';
import {
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

// BKM-019 (owner 2026-11-02): «¡Quedan solo N lugares con 15 % de
// descuento!». The list tells a first-time buyer how many launch places are
// left only when 10 or fewer remain, so the internal total never leaves the
// backend.
describe('launch places left on the plan list', () => {
  let world: PaymentWorld;

  beforeAll(async () => {
    world = await startPaymentWorld();
  });

  afterAll(async () => {
    await world?.stop();
  });

  const placesTaken = () =>
    world.prisma.founderMembership.count({
      where: { deletedAt: null, status: { in: ['ACTIVE', 'RESERVED'] } },
    });

  const setFounderPlaces = async (founderPlaces: number) => {
    const author = await world.prisma.account.findFirstOrThrow({
      where: { email: 'paola.mendoza@example.com', deletedAt: null },
      select: { id: true },
    });
    const current = await readCurrentStudioSettings(world.prisma);
    await world.prisma.studioSettingsVersion.create({
      data: {
        ...current,
        version: current.version + 1,
        founderPlaces,
        openingDate: null,
        createdByAccountId: author.id,
      },
    });
  };

  const listFor = async (clientId: string) =>
    priceFounderPlanList(
      world.prisma,
      clientId,
      await createCatalogRepository(world.prisma).listVisiblePlans(),
    );

  it('says nothing while more than 10 places are left', async () => {
    await setFounderPlaces((await placesTaken()) + 11);
    const client = await world.newClient('Primera Compra');

    const plans = await listFor(client.clientId);
    expect(plans.some((item) => item.listPriceCentavos !== undefined)).toBe(
      true,
    );
    for (const item of plans) expect(item.launchPlacesLeft).toBeUndefined();
  });

  it('tells a first-time buyer the places left once 10 or fewer remain', async () => {
    await setFounderPlaces((await placesTaken()) + 6);
    const client = await world.newClient('Casi Última');

    const plans = await listFor(client.clientId);
    const discounted = plans.filter(
      (item) => item.listPriceCentavos !== undefined,
    );
    expect(discounted.length).toBeGreaterThan(0);
    for (const item of discounted) expect(item.launchPlacesLeft).toBe(6);
  });
});
