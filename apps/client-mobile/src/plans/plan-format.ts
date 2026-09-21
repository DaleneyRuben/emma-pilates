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

function months(durationMonths: number): string {
  return durationMonths === 1 ? "1 mes" : `${durationMonths} meses`;
}

export function describeValidity(durationMonths: number): string {
  return `Válido por ${months(durationMonths)}`;
}

export function describePlanTerms(
  classAllowance: number,
  durationMonths: number,
): string {
  const validity = durationMonths === 1 ? "válido" : "válidas";
  return `${classAllowance} clases · ${validity} por ${months(durationMonths)}`;
}
