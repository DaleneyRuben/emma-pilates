export const evaluationSaleLabel = 'Evaluación nutricional';

// A paid Evaluation stores the Client's Plan name as its snapshot. Staff and
// admin read the sale, so the label follows the kind.
export const saleLabel = (row: {
  kind: string;
  planNameSnapshot: string;
}): string =>
  row.kind === 'evaluation' ? evaluationSaleLabel : row.planNameSnapshot;
