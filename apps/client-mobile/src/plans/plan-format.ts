import { formatBolivianos } from "@pilates/mobile-core";

export { formatBolivianos };

function months(durationMonths: number): string {
  return durationMonths === 1 ? "1 mes" : `${durationMonths} meses`;
}

export function describeValidity(durationMonths: number): string {
  return `Válido por ${months(durationMonths)}`;
}

export function describePlanTerms(classAllowance: number, durationMonths: number): string {
  const validity = durationMonths === 1 ? "válido" : "válidas";
  return `${classAllowance} clases · ${validity} por ${months(durationMonths)}`;
}
