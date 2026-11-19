export const evaluationSaleLabel = 'Evaluación nutricional';

// A paid Evaluation stores the Client's Plan name as its snapshot. Staff and
// admin read the sale, so the label follows the kind.
export const saleLabel = (row: {
  kind: string;
  planNameSnapshot: string;
}): string =>
  // Rows carry Prisma's EVALUATION; views carry evaluation (walkthrough n.º 65).
  row.kind.toLowerCase() === 'evaluation'
    ? evaluationSaleLabel
    : row.planNameSnapshot;

/** «La factura de tu plan 8 clases…», or «…de tu evaluación nutricional…». */
export const invoiceReadyMessage = (row: {
  kind: string;
  planNameSnapshot: string;
}): string => {
  const sale =
    saleLabel(row) === evaluationSaleLabel
      ? 'tu evaluación nutricional'
      : `tu plan ${row.planNameSnapshot}`;
  return `La factura de ${sale} ya está en Mis facturas.`;
};
