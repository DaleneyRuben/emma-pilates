export type PromotionErrorCode =
  | 'promotion_not_found'
  | 'promotion_archived'
  | 'promotion_image_not_ready'
  | 'promotion_image_required'
  | 'promotion_order_incomplete'
  | 'invalid_promotion_value'
  | 'idempotency_key_reused';

const statuses: Record<PromotionErrorCode, number> = {
  promotion_not_found: 404,
  promotion_archived: 409,
  promotion_image_not_ready: 409,
  promotion_image_required: 409,
  promotion_order_incomplete: 409,
  invalid_promotion_value: 400,
  idempotency_key_reused: 409,
};

export class PromotionError extends Error {
  readonly status: number;

  constructor(readonly code: PromotionErrorCode) {
    super(code);
    this.name = 'PromotionError';
    this.status = statuses[code];
  }
}

// Follow-up 39: Borrador, Programada, Activa, Finalizada, Archivada.
export type PromotionState =
  'draft' | 'scheduled' | 'active' | 'ended' | 'archived';

export const promotionStates: readonly PromotionState[] = [
  'draft',
  'scheduled',
  'active',
  'ended',
  'archived',
];

type PromotionWindow = {
  publishedAt: Date | null;
  archivedAt: Date | null;
  displayStartsOn: Date;
  displayEndsOn: Date;
};

// `today` is a Bolivia civil date at UTC midnight (ADR-0057), like the window.
export const promotionState = (
  promotion: PromotionWindow,
  today: Date,
): PromotionState => {
  if (promotion.archivedAt !== null) return 'archived';
  if (promotion.publishedAt === null) return 'draft';
  if (today.getTime() < promotion.displayStartsOn.getTime()) return 'scheduled';
  if (today.getTime() > promotion.displayEndsOn.getTime()) return 'ended';
  return 'active';
};

export type PromotionValues = {
  headline: string;
  description: string;
  displayStartsOn: Date;
  displayEndsOn: Date;
};

export const promotionCopyLimits = { headline: 80, description: 280 } as const;

export const requirePromotionValues = (
  input: PromotionValues,
): PromotionValues => {
  const headline = input.headline.trim();
  const description = input.description.trim();
  if (
    headline.length === 0 ||
    headline.length > promotionCopyLimits.headline ||
    description.length === 0 ||
    description.length > promotionCopyLimits.description ||
    input.displayEndsOn.getTime() < input.displayStartsOn.getTime()
  ) {
    throw new PromotionError('invalid_promotion_value');
  }
  return { ...input, headline, description };
};

// AW17 drag order: the request must name every live Promotion exactly once.
export const orderedPromotionIds = (
  liveIds: readonly string[],
  requestedIds: readonly string[],
): string[] => {
  const live = new Set(liveIds);
  const requested = new Set(requestedIds);
  if (
    requestedIds.length !== liveIds.length ||
    requested.size !== requestedIds.length ||
    requestedIds.some((id) => !live.has(id))
  ) {
    throw new PromotionError('promotion_order_incomplete');
  }
  return [...requestedIds];
};
