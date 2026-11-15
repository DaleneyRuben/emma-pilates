// A paid Evaluation is sold for one slot; staff read its time beside the
// sale (walkthrough n.º 65). A Plan sale has no Evaluation.
export const evaluationSaleSelect = {
  evaluation: { select: { slot: { select: { startsAt: true } } } },
} as const;

export const evaluationStartsAtOf = (row: {
  evaluation: { slot: { startsAt: Date } } | null;
}): { evaluationStartsAt?: Date } =>
  row.evaluation === null
    ? {}
    : { evaluationStartsAt: row.evaluation.slot.startsAt };
