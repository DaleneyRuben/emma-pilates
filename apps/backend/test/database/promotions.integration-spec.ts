import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  codeOf,
  input,
  now,
  PromotionWorld,
  startPromotionWorld,
} from './promotions-test-support';

describe('Promotion commands (PostgreSQL)', () => {
  let world: PromotionWorld;
  let prisma: PrismaClient;
  let commands: PromotionWorld['commands'];
  let readyImage: PromotionWorld['readyImage'];
  let administrator: AuthenticatedPrincipal;
  let assistant: AuthenticatedPrincipal;
  let client: AuthenticatedPrincipal;

  beforeAll(async () => {
    world = await startPromotionWorld();
    ({ prisma, commands, readyImage, administrator, assistant, client } =
      world);
  });

  afterAll(async () => {
    await world?.stop();
  });

  // Audit records are append-only; every assertion on them names its target.
  afterEach(async () => {
    await prisma.promotion.deleteMany();
  });

  it('creates a draft at the end of the order, idempotently, and audits it', async () => {
    const key = randomUUID();
    const first = await commands().createPromotion(
      { ...input, imageAssetId: null },
      administrator,
      key,
    );
    expect(first).toMatchObject({
      headline: 'Sábados de octubre',
      displayStartsOn: '2026-09-20',
      displayEndsOn: '2026-10-31',
      displayOrder: 0,
      publishedAt: null,
      state: 'draft',
      image: null,
    });

    const replay = await commands().createPromotion(
      { ...input, imageAssetId: null },
      administrator,
      key,
    );
    expect(replay).toEqual(first);
    await expect(
      codeOf(
        commands().createPromotion(
          { ...input, headline: 'Otra', imageAssetId: null },
          administrator,
          key,
        ),
      ),
    ).resolves.toBe('idempotency_key_reused');

    const second = await commands().createPromotion(
      { ...input, headline: 'Segunda', imageAssetId: null },
      administrator,
      randomUUID(),
    );
    expect(second.displayOrder).toBe(1);
    expect(await prisma.promotion.count()).toBe(2);
    expect(
      await prisma.auditRecord.count({
        where: { actionCode: 'promotion.created', targetId: first.id },
      }),
    ).toBe(1);
  });

  it('refuses everyone but an Administrator', async () => {
    for (const principal of [assistant, client]) {
      await expect(
        codeOf(
          commands().createPromotion(
            { ...input, imageAssetId: null },
            principal,
            randomUUID(),
          ),
        ),
      ).resolves.toBe('AdministrationError');
      await expect(codeOf(commands().listPromotions(principal))).resolves.toBe(
        'AdministrationError',
      );
    }
  });

  it('attaches a ready image on create, publishes public copies, lists the active Promotion, and unpublishes', async () => {
    const image = await readyImage(administrator.accountId);
    const created = await commands().createPromotion(
      { ...input, imageAssetId: image.id },
      administrator,
      randomUUID(),
    );
    expect(created.image).toEqual({
      imageAssetId: image.id,
      width: 2400,
      height: 1350,
    });
    expect(
      (await prisma.imageAsset.findUniqueOrThrow({ where: { id: image.id } }))
        .state,
    ).toBe('ATTACHED');
    expect(await commands().listActivePromotions()).toEqual([]);

    const published = await commands().publishPromotion(
      { promotionId: created.id },
      administrator,
    );
    expect(published.state).toBe('active');
    expect(published.publishedAt).toBe(now.toISOString());

    const active = await commands().listActivePromotions();
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      id: created.id,
      headline: 'Sábados de octubre',
    });
    expect(
      active[0].image.sources.map((s) => [s.kind, s.width, s.height]),
    ).toEqual([
      ['promotion_480', 480, 270],
      ['promotion_960', 960, 540],
      ['promotion_1440', 1440, 810],
    ]);
    expect(active[0].image.sources[0].imageAssetId).toBe(image.id);
    expect(active[0].image.sources[0].deliveryVersion).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    await expect(
      commands().readPublicImage({
        imageAssetId: image.id,
        kind: 'promotion_960',
        deliveryVersion: active[0].image.sources[1].deliveryVersion,
      }),
    ).resolves.toMatchObject({ mediaType: 'image/webp' });

    const unpublished = await commands().unpublishPromotion(
      { promotionId: created.id },
      administrator,
    );
    expect(unpublished.state).toBe('draft');
    expect(await commands().listActivePromotions()).toEqual([]);
    await expect(
      commands().readPublicImage({
        imageAssetId: image.id,
        kind: 'promotion_960',
        deliveryVersion: active[0].image.sources[1].deliveryVersion,
      }),
    ).resolves.toBeNull();
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
      'promotion.unpublished',
    ]);
  });
});
