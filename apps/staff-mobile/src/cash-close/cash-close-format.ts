import { colors } from "@pilates/mobile-core";

// Cash-close amounts keep two decimals (es-BO). Global formatBolivianos in
// mobile-core still rounds to whole bolivianos (UX-010) for the rest of the app.
const cashCloseBolivianos = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatCashCloseBolivianos(centavos: number): string {
  return `Bs ${cashCloseBolivianos.format(centavos / 100)}`;
}

// «520», «520,5», «520,50», or «520.50» typed into «Efectivo contado», in
// centavos; anything else (thousands separators included) is unreadable.
export function parseCountedCentavos(text: string): number | null {
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (match === null) return null;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return Number(match[1]) * 100 + Number(fraction);
}

// «Bs 0,00», «+Bs 5,50», «−Bs 10,00» (a true minus sign, as S25 writes it).
export function formatSignedBolivianos(centavos: number): string {
  if (centavos === 0) return formatCashCloseBolivianos(0);
  return `${centavos > 0 ? "+" : "−"}${formatCashCloseBolivianos(Math.abs(centavos))}`;
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
