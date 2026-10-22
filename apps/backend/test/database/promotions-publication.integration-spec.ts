import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  codeOf,
  day,
  input,
  now,
  PromotionWorld,
  startPromotionWorld,
} from './promotions-test-support';

describe('Promotion commands (PostgreSQL, publication and images)', () => {
  let world: PromotionWorld;
  let prisma: PrismaClient;
  let commands: PromotionWorld['commands'];
  let readyImage: PromotionWorld['readyImage'];
  let administrator: AuthenticatedPrincipal;

  beforeAll(async () => {
    world = await startPromotionWorld();
    ({ prisma, commands, readyImage, administrator } = world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  // Audit records are append-only; every assertion on them names its target.
  afterEach(async () => {
    await prisma.promotion.deleteMany();
  });

  it('hides a published Promotion outside its window and orders the active ones by display order', async () => {
    const early = await commands().createPromotion(
      {
        ...input,
        headline: 'Vigente',
        imageAssetId: (await readyImage(administrator.accountId)).id,
      },
      administrator,
      randomUUID(),
    );
    const future = await commands().createPromotion(
      {
        ...input,
        headline: 'Futura',
        displayStartsOn: day('2026-10-01'),
        imageAssetId: (await readyImage(administrator.accountId)).id,
      },
      administrator,
      randomUUID(),
    );
    const past = await commands().createPromotion(
      {
        ...input,
        headline: 'Pasada',
        displayStartsOn: day('2026-09-01'),
        displayEndsOn: day('2026-09-23'),
        imageAssetId: (await readyImage(administrator.accountId)).id,
      },
      administrator,
      randomUUID(),
    );
    const second = await commands().createPromotion(
      {
        ...input,
        headline: 'Segunda vigente',
        imageAssetId: (await readyImage(administrator.accountId)).id,
      },
      administrator,
      randomUUID(),
    );
    for (const promotion of [early, future, past, second]) {
      await commands().publishPromotion(
        { promotionId: promotion.id },
        administrator,
      );
    }

    const listed = await commands().listPromotions(administrator);
    expect(listed.map((p) => [p.headline, p.state])).toEqual([
      ['Vigente', 'active'],
      ['Futura', 'scheduled'],
      ['Pasada', 'ended'],
      ['Segunda vigente', 'active'],
    ]);

    await commands().reorderPromotions(
      { promotionIds: [second.id, past.id, early.id, future.id] },
      administrator,
    );
    expect(
      (await commands().listActivePromotions()).map((p) => p.headline),
    ).toEqual(['Segunda vigente', 'Vigente']);
    await expect(
      codeOf(
        commands().reorderPromotions(
          { promotionIds: [second.id, early.id] },
          administrator,
        ),
      ),
    ).resolves.toBe('promotion_order_incomplete');
  });

  it('refuses publishing without an image, with a foreign or unready image, and after archiving', async () => {
    const draft = await commands().createPromotion(
      { ...input, imageAssetId: null },
      administrator,
      randomUUID(),
    );
    await expect(
      codeOf(
        commands().publishPromotion({ promotionId: draft.id }, administrator),
      ),
    ).resolves.toBe('promotion_image_required');

    const receipt = await prisma.imageAsset.create({
      data: {
        ownerAccountId: administrator.accountId,
        purpose: 'TRANSFER_RECEIPT',
        state: 'READY',
        pendingObjectKey: `pending/transfer_receipt/${randomUUID()}`,
        declaredMediaType: 'PNG',
        declaredByteSize: 10,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 2)),
        createdAt: new Date(now.getTime() - 60_000),
        expiresAt: now,
        finalizedAt: now,
      },
    });
    await expect(
      codeOf(
        commands().updatePromotion(
          { ...input, promotionId: draft.id, imageAssetId: receipt.id },
          administrator,
        ),
      ),
    ).resolves.toBe('promotion_image_not_ready');
    await expect(
      codeOf(
        commands().updatePromotion(
          { ...input, promotionId: draft.id, imageAssetId: randomUUID() },
          administrator,
        ),
      ),
    ).resolves.toBe('promotion_image_not_ready');

    await commands().archivePromotion({ promotionId: draft.id }, administrator);
    await expect(
      codeOf(
        commands().publishPromotion({ promotionId: draft.id }, administrator),
      ),
    ).resolves.toBe('promotion_archived');
    expect(await commands().listPromotions(administrator)).toEqual([]);
    await expect(
      codeOf(
        commands().publishPromotion(
          { promotionId: randomUUID() },
          administrator,
        ),
      ),
    ).resolves.toBe('promotion_not_found');
  });

  // Follow-up 39: replacing or removing the image of a published Promotion
  // unpublishes it; ADR-0076: the old image and every variant go.
  it('replacing the image unpublishes the Promotion and detaches the old image; archiving detaches too', async () => {
    const first = await readyImage(administrator.accountId);
    const replacement = await readyImage(administrator.accountId);
    const created = await commands().createPromotion(
      { ...input, imageAssetId: first.id },
      administrator,
      randomUUID(),
    );
    await commands().publishPromotion(
      { promotionId: created.id },
      administrator,
    );

    const edited = await commands().updatePromotion(
      {
        ...input,
        headline: 'Editada',
        promotionId: created.id,
        imageAssetId: replacement.id,
      },
      administrator,
    );
    expect(edited).toMatchObject({
      headline: 'Editada',
      state: 'draft',
      publishedAt: null,
      image: { imageAssetId: replacement.id },
    });
    const old = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: first.id },
      include: { variants: true },
    });
    expect(old.deleteRequestedAt).toEqual(now);
    expect(old.variants.every((v) => v.deleteRequestedAt !== null)).toBe(true);
    expect(
      (
        await prisma.imageAsset.findUniqueOrThrow({
          where: { id: replacement.id },
        })
      ).state,
    ).toBe('ATTACHED');

    // The same image again is not a replacement.
    const same = await commands().updatePromotion(
      {
        ...input,
        headline: 'Misma imagen',
        promotionId: created.id,
        imageAssetId: replacement.id,
      },
      administrator,
    );
    expect(same.image?.imageAssetId).toBe(replacement.id);
    expect(
      (
        await prisma.imageAsset.findUniqueOrThrow({
          where: { id: replacement.id },
        })
      ).deleteRequestedAt,
    ).toBeNull();

    await expect(
      commands().readPromotionImage(
        { promotionId: created.id, kind: 'promotion_480' },
        administrator,
      ),
    ).resolves.toMatchObject({ mediaType: 'image/webp' });

    await commands().archivePromotion(
      { promotionId: created.id },
      administrator,
    );
    expect(
      (
        await prisma.imageAsset.findUniqueOrThrow({
          where: { id: replacement.id },
        })
      ).deleteRequestedAt,
    ).toEqual(now);
    expect(
      (await prisma.promotion.findUniqueOrThrow({ where: { id: created.id } }))
        .archivedAt,
    ).toEqual(now);
    expect(
      (
        await prisma.auditRecord.findMany({
          where: { targetId: created.id },
          orderBy: { occurredAt: 'asc' },
          select: { actionCode: true },
        })
      ).map((r) => r.actionCode),
    ).toEqual([
      'promotion.created',
      'promotion.published',
      'promotion.updated',
      'promotion.updated',
      'promotion.archived',
    ]);
  });
});
