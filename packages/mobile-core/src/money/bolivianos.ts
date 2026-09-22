const wholeBolivianos = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 0,
});
const fractionalBolivianos = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatBolivianos(centavos: number): string {
  const formatter =
    centavos % 100 === 0 ? wholeBolivianos : fractionalBolivianos;
  return `Bs ${formatter.format(centavos / 100)}`;
}
