// Amounts staff reconcile keep two decimals (es-BO): the Cash Close and
// «Mis pagos». Global formatBolivianos in mobile-core still rounds to whole
// bolivianos (UX-010) for prices.
const exactBolivianos = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatExactBolivianos(centavos: number): string {
  return `Bs ${exactBolivianos.format(centavos / 100)}`;
}
