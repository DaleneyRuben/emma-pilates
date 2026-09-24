import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  ImageMediaType,
  ImageVariantVisibility,
} from '../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import {
  readPublicImageVariant,
  readPublicImageVariants,
  type PublicImageVariant,
} from '../../uploads/image-asset-attachments';
import type { ImageVariantKind } from '../../uploads/image-variants';
import { requireAdministrator } from '../administration/administration-errors';
import {
  PromotionError,
  promotionState,
  type PromotionState,
} from './promotion-rules';

export const promotionSelect = {
  id: true,
  headline: true,
  description: true,
  displayStartsOn: true,
  displayEndsOn: true,
  displayOrder: true,
  publishedAt: true,
  archivedAt: true,
  updatedAt: true,
  imageAsset: {
    select: { id: true, verifiedWidth: true, verifiedHeight: true },
  },
} satisfies Prisma.PromotionSelect;

export type PromotionRow = Prisma.PromotionGetPayload<{
  select: typeof promotionSelect;
}>;

// JSON-safe (the idempotent create stores and replays it): civil dates as
// `YYYY-MM-DD`, instants as ISO strings.
export type AdminPromotionView = {
  id: string;
  headline: string;
  description: string;
  displayStartsOn: string;
  displayEndsOn: string;
  displayOrder: number;
  publishedAt: string | null;
  state: PromotionState;
  image: { imageAssetId: string; width: number; height: number } | null;
  updatedAt: string;
};

export type ActivePromotionView = {
  id: string;
  headline: string;
  description: string;
  image: { sources: (PublicImageVariant & { imageAssetId: string })[] };
};

export const promotionImageKinds = [
  'promotion_480',
  'promotion_960',
  'promotion_1440',
] as const;
export type PromotionImageKind = (typeof promotionImageKinds)[number];

const civil = (date: Date): string => date.toISOString().slice(0, 10);

const mediaTypes: Record<ImageMediaType, string> = {
  [ImageMediaType.JPEG]: 'image/jpeg',
  [ImageMediaType.PNG]: 'image/png',
  [ImageMediaType.WEBP]: 'image/webp',
};

export const toAdminPromotionView = (
  row: PromotionRow,
  today: Date,
): AdminPromotionView => ({
  id: row.id,
  headline: row.headline,
  description: row.description,
  displayStartsOn: civil(row.displayStartsOn),
  displayEndsOn: civil(row.displayEndsOn),
  displayOrder: row.displayOrder,
  publishedAt: row.publishedAt === null ? null : row.publishedAt.toISOString(),
  state: promotionState(row, today),
  image:
    row.imageAsset === null
      ? null
      : {
          imageAssetId: row.imageAsset.id,
          width: row.imageAsset.verifiedWidth ?? 0,
          height: row.imageAsset.verifiedHeight ?? 0,
        },
  updatedAt: row.updatedAt.toISOString(),
});

export const createPrismaPromotionReads = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const today = () => boliviaDate(dependencies.now());

  return {
    // AW17: every live Promotion in carousel order, archived ones excluded.
    listPromotions: async (
      principal: AuthenticatedPrincipal,
    ): Promise<AdminPromotionView[]> => {
      requireAdministrator(principal);
      const rows = await prisma.promotion.findMany({
        where: { archivedAt: null },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: promotionSelect,
      });
      const day = today();
      return rows.map((row) => toAdminPromotionView(row, day));
    },

    // AW17 thumbnails and AW18's preview read the private variant.
    readPromotionImage: async (
      command: { promotionId: string; kind: PromotionImageKind },
      principal: AuthenticatedPrincipal,
    ): Promise<{ objectKey: string; mediaType: string }> => {
      requireAdministrator(principal);
      const row = await prisma.promotion.findUnique({
        where: { id: command.promotionId },
        select: {
          imageAsset: {
            select: {
              variants: {
                where: {
                  kind: command.kind.toUpperCase() as never,
                  visibility: ImageVariantVisibility.PRIVATE,
                  deleteRequestedAt: null,
                  deletedAt: null,
                },
                select: { storageKey: true, mediaType: true },
                take: 1,
              },
            },
          },
        },
      });
      if (row === null) throw new PromotionError('promotion_not_found');
      const variant = row.imageAsset?.variants[0];
      if (variant === undefined) {
        throw new PromotionError('promotion_image_required');
      }
      return {
        objectKey: variant.storageKey,
        mediaType: mediaTypes[variant.mediaType],
      };
    },

    // Client 02: published, not archived, and inside the display window
    // today, with the public copies ADR-0077 exposes.
    listActivePromotions: async (): Promise<ActivePromotionView[]> => {
      const day = today();
      const rows = await prisma.promotion.findMany({
        where: {
          publishedAt: { not: null },
          archivedAt: null,
          imageAssetId: { not: null },
          displayStartsOn: { lte: day },
          displayEndsOn: { gte: day },
        },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          headline: true,
          description: true,
          imageAssetId: true,
        },
      });
      const variants = await readPublicImageVariants(
        prisma,
        rows.map((row) => row.imageAssetId ?? ''),
      );
      return rows.flatMap((row) => {
        const sources = variants.get(row.imageAssetId ?? '') ?? [];
        if (sources.length === 0) return [];
        return [
          {
            id: row.id,
            headline: row.headline,
            description: row.description,
            image: {
              sources: sources.map((source) => ({
                ...source,
                imageAssetId: row.imageAssetId ?? '',
              })),
            },
          },
        ];
      });
    },

    readPublicImage: (input: {
      imageAssetId: string;
      kind: ImageVariantKind;
      deliveryVersion: string;
    }) => readPublicImageVariant(prisma, input),
  };
};

export type PromotionReads = ReturnType<typeof createPrismaPromotionReads>;
