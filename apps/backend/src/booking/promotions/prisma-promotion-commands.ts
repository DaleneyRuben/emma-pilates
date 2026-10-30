import { randomUUID } from 'node:crypto';
import { retrySerializable } from '../../database/retry-serializable';
import { runIdempotent } from '../../database/run-idempotent';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AuditActorKind, AuditOutcome } from '../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import {
  attachImageAsset,
  detachImageAsset,
  ImageAssetNotAttachableError,
  publishImageVariants,
  unpublishImageVariants,
} from '../../uploads/image-asset-attachments';
import type { ObjectStorage } from '../../uploads/object-storage';
import {
  requireAdministrator,
  type AdministratorActor,
} from '../administration/administration-errors';
import {
  createPrismaPromotionReads,
  promotionSelect,
  toAdminPromotionView,
  type AdminPromotionView,
} from './prisma-promotion-reads';
import {
  orderedPromotionIds,
  PromotionError,
  requirePromotionValues,
  type PromotionValues,
} from './promotion-rules';

type Transaction = Prisma.TransactionClient;
type PromotionInput = PromotionValues & { imageAssetId: string | null };
type PromotionStorage = Pick<ObjectStorage, 'get' | 'replace'>;

const serializable = { isolationLevel: 'Serializable' } as const;
const civil = (date: Date): string => date.toISOString().slice(0, 10);

// Booking & Membership: Administrator-only Promotion management (AW17, AW18,
// follow-up 39) over the schema BKM-001 approved.
export const createPrismaPromotionCommands = (
  prisma: PrismaClient,
  storage: PromotionStorage,
  dependencies: { now: () => Date },
) => {
  const reads = createPrismaPromotionReads(prisma, dependencies);
  const today = () => boliviaDate(dependencies.now());
  const view = (row: Parameters<typeof toAdminPromotionView>[0]) =>
    toAdminPromotionView(row, today());

  const transact = <Result>(
    work: (transaction: Transaction) => Promise<Result>,
  ): Promise<Result> =>
    retrySerializable(() => prisma.$transaction(work, serializable));

  const recordAudit = (
    transaction: Transaction,
    actor: AdministratorActor,
    input: {
      actionCode:
        | 'promotion.created'
        | 'promotion.updated'
        | 'promotion.published'
        | 'promotion.unpublished'
        | 'promotion.archived';
      promotionId: string;
      metadata: Prisma.InputJsonObject;
    },
  ) =>
    transaction.auditRecord.create({
      data: {
        actionCode: input.actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: actor.audit.accountId,
        actorRole: actor.audit.role,
        impersonationId: actor.audit.impersonationId,
        targetType: 'promotion',
        targetId: input.promotionId,
        correlationId: randomUUID(),
        metadata: input.metadata,
        occurredAt: dependencies.now(),
      },
    });

  const attach = async (
    transaction: Transaction,
    imageAssetId: string,
    actor: AdministratorActor,
  ) => {
    try {
      await attachImageAsset(transaction, {
        imageAssetId,
        ownerAccountId: actor.accountId,
        purpose: 'promotion',
        now: dependencies.now(),
      });
    } catch (error) {
      if (error instanceof ImageAssetNotAttachableError) {
        throw new PromotionError('promotion_image_not_ready');
      }
      throw error;
    }
  };

  const load = async (transaction: Transaction, promotionId: string) => {
    const row = await transaction.promotion.findUnique({
      where: { id: promotionId },
      select: promotionSelect,
    });
    if (row === null) throw new PromotionError('promotion_not_found');
    return row;
  };

  return {
    ...reads,

    // A new Promotion takes the last carousel position as a draft.
    createPromotion: async (
      input: PromotionInput,
      principal: AuthenticatedPrincipal,
      idempotencyKey: string,
    ): Promise<AdminPromotionView> => {
      const actor = requireAdministrator(principal);
      const values = requirePromotionValues(input);
      return runIdempotent(
        prisma,
        {
          accountId: actor.accountId,
          command: 'create_promotion',
          idempotencyKey,
          request: {
            ...values,
            displayStartsOn: civil(values.displayStartsOn),
            displayEndsOn: civil(values.displayEndsOn),
            imageAssetId: input.imageAssetId,
          },
          now: dependencies.now,
          onKeyReused: () => new PromotionError('idempotency_key_reused'),
        },
        async (transaction) => {
          if (input.imageAssetId !== null) {
            await attach(transaction, input.imageAssetId, actor);
          }
          const last = await transaction.promotion.aggregate({
            where: { archivedAt: null },
            _max: { displayOrder: true },
          });
          const row = await transaction.promotion.create({
            data: {
              ...values,
              imageAssetId: input.imageAssetId,
              displayOrder: (last._max.displayOrder ?? -1) + 1,
            },
            select: promotionSelect,
          });
          await recordAudit(transaction, actor, {
            actionCode: 'promotion.created',
            promotionId: row.id,
            metadata: { hasImage: input.imageAssetId !== null },
          });
          return view(row);
        },
      );
    },

    // Follow-up 39: removing or replacing the image unpublishes; ADR-0076:
    // the old image and its variants are released once the new one is in.
    updatePromotion: async (
      input: PromotionInput & { promotionId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<AdminPromotionView> => {
      const actor = requireAdministrator(principal);
      const values = requirePromotionValues(input);
      return transact(async (transaction) => {
        const previous = await load(transaction, input.promotionId);
        if (previous.archivedAt !== null) {
          throw new PromotionError('promotion_archived');
        }
        const previousImageId = previous.imageAsset?.id ?? null;
        const imageChanged = input.imageAssetId !== previousImageId;
        const unpublished = imageChanged && previous.publishedAt !== null;
        if (imageChanged && input.imageAssetId !== null) {
          await attach(transaction, input.imageAssetId, actor);
        }
        if (imageChanged && previousImageId !== null) {
          await detachImageAsset(transaction, {
            imageAssetId: previousImageId,
            now: dependencies.now(),
          });
        }
        const row = await transaction.promotion.update({
          where: { id: input.promotionId },
          data: {
            ...values,
            imageAssetId: input.imageAssetId,
            ...(unpublished ? { publishedAt: null } : {}),
          },
          select: promotionSelect,
        });
        await recordAudit(transaction, actor, {
          actionCode: 'promotion.updated',
          promotionId: row.id,
          metadata: { imageChanged, unpublished },
        });
        return view(row);
      });
    },

    publishPromotion: async (
      command: { promotionId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<AdminPromotionView> => {
      const actor = requireAdministrator(principal);
      return transact(async (transaction) => {
        const previous = await load(transaction, command.promotionId);
        if (previous.archivedAt !== null) {
          throw new PromotionError('promotion_archived');
        }
        if (previous.imageAsset === null) {
          throw new PromotionError('promotion_image_required');
        }
        await publishImageVariants(transaction, storage, {
          imageAssetId: previous.imageAsset.id,
          now: dependencies.now(),
        });
        const row = await transaction.promotion.update({
          where: { id: command.promotionId },
          data: { publishedAt: dependencies.now() },
          select: promotionSelect,
        });
        await recordAudit(transaction, actor, {
          actionCode: 'promotion.published',
          promotionId: row.id,
          metadata: {
            displayStartsOn: civil(row.displayStartsOn),
            displayEndsOn: civil(row.displayEndsOn),
          },
        });
        return view(row);
      });
    },

    unpublishPromotion: async (
      command: { promotionId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<AdminPromotionView> => {
      const actor = requireAdministrator(principal);
      return transact(async (transaction) => {
        const previous = await load(transaction, command.promotionId);
        if (previous.publishedAt === null) return view(previous);
        if (previous.imageAsset !== null) {
          await unpublishImageVariants(transaction, {
            imageAssetId: previous.imageAsset.id,
            now: dependencies.now(),
          });
        }
        const row = await transaction.promotion.update({
          where: { id: command.promotionId },
          data: { publishedAt: null },
          select: promotionSelect,
        });
        await recordAudit(transaction, actor, {
          actionCode: 'promotion.unpublished',
          promotionId: row.id,
          metadata: {},
        });
        return view(row);
      });
    },

    // AW17's delete retires the record (BKM-001: archived, never removed)
    // and releases its image.
    archivePromotion: async (
      command: { promotionId: string },
      principal: AuthenticatedPrincipal,
    ): Promise<void> => {
      const actor = requireAdministrator(principal);
      return transact(async (transaction) => {
        const previous = await load(transaction, command.promotionId);
        if (previous.archivedAt !== null) return;
        if (previous.imageAsset !== null) {
          await detachImageAsset(transaction, {
            imageAssetId: previous.imageAsset.id,
            now: dependencies.now(),
          });
        }
        await transaction.promotion.update({
          where: { id: command.promotionId },
          data: { archivedAt: dependencies.now(), publishedAt: null },
        });
        await recordAudit(transaction, actor, {
          actionCode: 'promotion.archived',
          promotionId: command.promotionId,
          metadata: { wasPublished: previous.publishedAt !== null },
        });
      });
    },

    // Ordering is routine drag activity: renumbered, not audited.
    reorderPromotions: async (
      command: { promotionIds: string[] },
      principal: AuthenticatedPrincipal,
    ): Promise<AdminPromotionView[]> => {
      requireAdministrator(principal);
      return transact(async (transaction) => {
        const live = await transaction.promotion.findMany({
          where: { archivedAt: null },
          select: { id: true },
        });
        const ordered = orderedPromotionIds(
          live.map((row) => row.id),
          command.promotionIds,
        );
        for (const [index, id] of ordered.entries()) {
          await transaction.promotion.update({
            where: { id },
            data: { displayOrder: index },
          });
        }
        const rows = await transaction.promotion.findMany({
          where: { archivedAt: null },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          select: promotionSelect,
        });
        return rows.map(view);
      });
    },
  };
};

export type PromotionCommands = ReturnType<
  typeof createPrismaPromotionCommands
>;
