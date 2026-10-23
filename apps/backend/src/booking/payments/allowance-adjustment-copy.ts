export const shownAdjustmentReasons = [
  'gift_new_client',
  'invite_converted',
  'campaign',
  'courtesy',
  'class_return',
  'consumption',
] as const;

export type AdjustmentReason = (typeof shownAdjustmentReasons)[number];

// The origin a person sees for one extra class (decisions §5.6).
export const adjustmentReasonLabels: Record<AdjustmentReason, string> = {
  gift_new_client: 'Regalo de bienvenida',
  invite_converted: 'Invitación',
  campaign: 'Campaña',
  courtesy: 'Cortesía',
  class_return: 'Clase devuelta',
  consumption: '',
};

// «Clases extra: 1 · Regalo de bienvenida» for one gift, and the same shape
// for any other single origin. Several origins name the first one granted.
export const extraClassesLine = (
  adjustments: readonly { classes: number; reason: AdjustmentReason }[],
): string | null => {
  const granted = adjustments.filter(
    (adjustment) =>
      adjustment.classes > 0 && adjustment.reason !== 'consumption',
  );
  const total = adjustments.reduce(
    (sum, adjustment) => sum + adjustment.classes,
    0,
  );
  if (total <= 0 || granted.length === 0) return null;
  const label = adjustmentReasonLabels[granted[0].reason];
  return `Clases extra: ${total} · ${label}`;
};
