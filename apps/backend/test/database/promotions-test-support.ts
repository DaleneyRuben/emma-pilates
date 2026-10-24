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
import { startDatabaseTestContext } from './database-test-context';

export const today = new Date('2026-09-24T00:00:00.000Z');
// 2026-09-24 15:00 in La Paz (UTC-4).
export const now = new Date('2026-09-24T19:00:00.000Z');
export const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const fixtures = buildDevelopmentFixtures({ today });

export const codeOf = (work: Promise<unknown>) =>
  work.then(
    () => 'ok',
    (error: unknown) =>
      error instanceof PromotionError ? error.code : (error as Error).name,
  );

export const input = {
  headline: 'Sábados de octubre',
  description: 'Abrimos los sábados por la mañana desde octubre.',
  displayStartsOn: day('2026-09-20'),
  displayEndsOn: day('2026-10-31'),
};

// The development fixtures on a disposable database with a temporary object
// store, the three principals the Promotion specs act as, and a ready image
// builder.
export const startPromotionWorld = async () => {
  const context = await startDatabaseTestContext();
  const prisma = new PrismaClient({
    adapter: createPrismaAdapter(context.databaseUrl),
  });
  const storageRoot = await mkdtemp(join(tmpdir(), 'pilates-promotions-'));
  const storage = new LocalObjectStorage(storageRoot);
  await applyDevelopmentFixtures(prisma, {
    fixtures,
    passwordHash: 'not-a-real-hash',
    now: () => now,
  });
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
      COORDINATOR: 'coordinator',
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

  return {
    prisma,
    commands,
    readyImage,
    administrator: await principalOf('paola.mendoza@example.com'),
    assistant: await principalOf('camila.rojas@example.com'),
    client: await principalOf('lucia@example.com'),
    stop: async () => {
      await prisma.$disconnect();
      await context.stop();
      await rm(storageRoot, { recursive: true, force: true });
    },
  };
};

export type PromotionWorld = Awaited<ReturnType<typeof startPromotionWorld>>;
