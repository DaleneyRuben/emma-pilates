import { colors, formatBolivianos } from "@pilates/mobile-core";

// «520», «520,5», «520,50», or «520.50» typed into «Efectivo contado», in
// centavos; anything else (thousands separators included) is unreadable.
export function parseCountedCentavos(text: string): number | null {
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (match === null) return null;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return Number(match[1]) * 100 + Number(fraction);
}

// «Bs 0», «+Bs 5,50», «−Bs 10» (a true minus sign, as S25 writes it).
export function formatSignedBolivianos(centavos: number): string {
  if (centavos === 0) return formatBolivianos(0);
  return `${centavos > 0 ? "+" : "−"}${formatBolivianos(Math.abs(centavos))}`;
}

export type DifferenceTone = { label: string; text: string; tint: string };

export function describeDifference(centavos: number): DifferenceTone {
  if (centavos === 0) {
    return { label: "Cuadra", text: colors.successText, tint: colors.successTint };
  }
  return centavos < 0
    ? { label: "Falta efectivo", text: colors.errorText, tint: colors.errorTint }
    : { label: "Sobra efectivo", text: colors.warningText, tint: colors.warningTint };
}

export function describeCashSales(count: number, branchName: string): string {
  if (count === 0) return "Todavía no hay ventas en efectivo hoy.";
  return `${count} ${count === 1 ? "venta" : "ventas"} en efectivo hoy en ${branchName}`;
}

export const cashCloseProblems: Record<string, string> = {
  cash_close_already_recorded: "La caja de hoy ya se cerró en esta sucursal.",
  branch_not_assigned: "Solo puedes cerrar la caja de tus sucursales.",
};

export const cashCloseFailure = "No pudimos cerrar la caja. Inténtalo de nuevo.";
