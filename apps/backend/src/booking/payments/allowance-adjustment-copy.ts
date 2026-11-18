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

// How one origin reads beside its count when several origins gave classes:
// «1 de invitación · 1 de campaña».
const countedReasonLabels: Record<AdjustmentReason, string> = {
  gift_new_client: 'de bienvenida',
  invite_converted: 'de invitación',
  campaign: 'de campaña',
  courtesy: 'de cortesía',
  class_return: 'devuelta',
  consumption: '',
};

// «Clases extra: 1 · Regalo de bienvenida» for one origin, however many classes
// it gave. Several origins are each named in the order first granted, with
// their counts while none is spent; once some are spent the counts no longer
// add up to the total, so only the names remain.
export const extraClassesLine = (
  adjustments: readonly { classes: number; reason: AdjustmentReason }[],
): string | null => {
  const granted = new Map<AdjustmentReason, number>();
  adjustments.forEach(({ classes, reason }) => {
    if (classes > 0 && reason !== 'consumption') {
      granted.set(reason, (granted.get(reason) ?? 0) + classes);
    }
  });
  const total = adjustments.reduce(
    (sum, adjustment) => sum + adjustment.classes,
    0,
  );
  if (total <= 0 || granted.size === 0) return null;
  const origins = [...granted];
  if (origins.length === 1) {
    return `Clases extra: ${total} · ${adjustmentReasonLabels[origins[0][0]]}`;
  }
  const grantedTotal = origins.reduce((sum, [, classes]) => sum + classes, 0);
  const parts = origins.map(([reason, classes]) =>
    total === grantedTotal
      ? `${classes} ${countedReasonLabels[reason]}`
      : adjustmentReasonLabels[reason],
  );
  return `Clases extra: ${total} · ${parts.join(' · ')}`;
};
