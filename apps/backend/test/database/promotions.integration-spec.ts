import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPromotionCommands } from '../../src/booking/promotions/prisma-promotion-commands';
import { PromotionError } from '../../src/booking/promotions/promotion-rules';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { LocalObjectStorage } from '../../src/uploads/local-object-storage';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-24T00:00:00.000Z');
// 2026-09-24 15:00 in La Paz (UTC-4).
const now = new Date('2026-09-24T19:00:00.000Z');
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const codeOf = (work: Promise<unknown>) =>
  work.then(
    () => 'ok',
    (error: unknown) =>
      error instanceof PromotionError ? error.code : (error as Error).name,
  );

describe('Promotion commands (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let storageRoot: string;
  let storage: LocalObjectStorage;
  let administrator: AuthenticatedPrincipal;
  let assistant: AuthenticatedPrincipal;
  let client: AuthenticatedPrincipal;
  const fixtures = buildDevelopmentFixtures({ today });
  const commands = (clock: Date = now) =>
    createPrismaPromotionCommands(prisma, storage, { now: () => clock });

  const principalOf = async (
    email: string,
  ): Promise<AuthenticatedPrincipal> => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: { id: true, clientId: true, staffMember: true },
    });
    const roles = {
      ADMINISTRATOR: 'administrator',
      ASSISTANT: 'assistant',
      TRAINER: 'trainer',
      NUTRITIONIST: 'nutritionist',
    } as const;
    return {
      accountId: account.id,
      authenticationSessionId: randomUUID(),
      identity:
        account.staffMember === null
          ? { kind: 'client', clientId: account.clientId! }
          : {
              kind: 'staff',
              staffMemberId: account.staffMember.id,
              role: roles[account.staffMember.role],
              branchIds: [],
            },
    };
  };

  const readyImage = async (ownerAccountId: string) => {
    const created = new Date(now.getTime() - 60 * 60 * 1_000);
    const asset = await prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose: 'PROMOTION',
        state: 'READY',
        pendingObjectKey: `pending/promotion/${randomUUID()}`,
        declaredMediaType: 'PNG',
        declaredByteSize: 10,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 2)),
        verifiedMediaType: 'PNG',
        verifiedByteSize: 10,
        verifiedChecksum: toPrismaBytes(Buffer.alloc(32, 2)),
        verifiedWidth: 2400,
        verifiedHeight: 1350,
        createdAt: created,
        expiresAt: new Date(created.getTime() + 15 * 60 * 1_000),
        finalizedAt: new Date(created.getTime() + 5 * 60 * 1_000),
        deletionDueAt: new Date(created.getTime() + 24 * 60 * 60 * 1_000),
        variants: {
          create: [480, 960, 1440].map((width) => ({
            kind: `PROMOTION_${width}` as 'PROMOTION_480',
            visibility: 'PRIVATE',
            storageKey: `private/promotion/${randomUUID()}/promotion_${width}`,
            mediaType: 'WEBP',
            byteSize: 3,
            width,
            height: (width * 9) / 16,
          })),
        },
      },
      include: { variants: true },
    });
    for (const variant of asset.variants) {
      await storage.put(variant.storageKey, Buffer.from('webp'));
    }
    return asset;
  };

  const input = {
    headline: 'Sábados de octubre',
    description: 'Abrimos los sábados por la mañana desde octubre.',
    displayStartsOn: day('2026-09-20'),
    displayEndsOn: day('2026-10-31'),
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    storageRoot = await mkdtemp(join(tmpdir(), 'pilates-promotions-'));
    storage = new LocalObjectStorage(storageRoot);
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
      now: () => now,
    });
    administrator = await principalOf('paola.mendoza@example.com');
    assistant = await principalOf('camila.rojas@example.com');
    client = await principalOf('lucia@example.com');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
    await rm(storageRoot, { recursive: true, force: true });
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
