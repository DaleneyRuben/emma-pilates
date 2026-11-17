import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  codeOf,
  day,
  input,
  PromotionWorld,
  startPromotionWorld,
} from './promotions-test-support';

// Finding 82: «Guardar borrador» keeps a Promotion before its window is
// chosen; only publishing needs both dates.
describe('Promotion commands (PostgreSQL, a draft without dates)', () => {
  let world: PromotionWorld;
  let prisma: PrismaClient;
  let commands: PromotionWorld['commands'];
  let readyImage: PromotionWorld['readyImage'];
  let administrator: AuthenticatedPrincipal;
  const undated = {
    headline: input.headline,
    description: input.description,
    displayStartsOn: null,
    displayEndsOn: null,
  };

  beforeAll(async () => {
    world = await startPromotionWorld();
    ({ prisma, commands, readyImage, administrator } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  afterEach(async () => {
    await prisma.promotion.deleteMany();
  });

  it('saves a draft without dates and refuses to publish it until both are set', async () => {
    const draft = await commands().createPromotion(
      {
        ...undated,
        imageAssetId: (await readyImage(administrator.accountId)).id,
      },
      administrator,
      randomUUID(),
    );
    expect(draft).toMatchObject({
      displayStartsOn: null,
      displayEndsOn: null,
      publishedAt: null,
      state: 'draft',
    });

    expect(
      await codeOf(
        commands().publishPromotion({ promotionId: draft.id }, administrator),
      ),
    ).toBe('promotion_dates_required');

    const halfDated = await commands().updatePromotion(
      {
        ...undated,
        displayStartsOn: input.displayStartsOn,
        imageAssetId: draft.image!.imageAssetId,
        promotionId: draft.id,
      },
      administrator,
    );
    expect(halfDated).toMatchObject({
      displayStartsOn: '2026-09-20',
      displayEndsOn: null,
    });
    expect(
      await codeOf(
        commands().publishPromotion({ promotionId: draft.id }, administrator),
      ),
    ).toBe('promotion_dates_required');

    await commands().updatePromotion(
      {
        ...input,
        imageAssetId: draft.image!.imageAssetId,
        promotionId: draft.id,
      },
      administrator,
    );
    const published = await commands().publishPromotion(
      { promotionId: draft.id },
      administrator,
    );
    expect(published.state).toBe('active');
  });

  it('refuses to clear a date of a published Promotion, in the command and in the database', async () => {
    const created = await commands().createPromotion(
      {
        ...input,
        imageAssetId: (await readyImage(administrator.accountId)).id,
      },
      administrator,
      randomUUID(),
    );
    await commands().publishPromotion(
      { promotionId: created.id },
      administrator,
    );

    expect(
      await codeOf(
        commands().updatePromotion(
          {
            ...input,
            displayEndsOn: null,
            imageAssetId: created.image!.imageAssetId,
            promotionId: created.id,
          },
          administrator,
        ),
      ),
    ).toBe('promotion_dates_required');

    await expect(
      prisma.$executeRaw`UPDATE booking.promotions SET display_ends_on = NULL WHERE id = ${created.id}::uuid`,
    ).rejects.toThrow(/promotions_publication_check/);
    await expect(
      prisma.$executeRaw`UPDATE booking.promotions SET display_ends_on = ${day('2026-09-01')} WHERE id = ${created.id}::uuid`,
    ).rejects.toThrow(/promotions_values_check/);
  });

  it('keeps an undated draft out of the Client carousel', async () => {
    await commands().createPromotion(
      {
        ...undated,
        imageAssetId: (await readyImage(administrator.accountId)).id,
      },
      administrator,
      randomUUID(),
    );
    expect(await commands().listActivePromotions()).toEqual([]);
    expect(await commands().listPromotions(administrator)).toEqual([
      expect.objectContaining({ state: 'draft', displayStartsOn: null }),
    ]);
  });
});
