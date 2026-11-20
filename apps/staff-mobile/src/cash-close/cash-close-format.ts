import { formatMoney } from "@pilates/api-contracts";
import type { TextTone } from "@pilates/mobile-core";

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
  if (centavos === 0) return formatMoney(0);
  return `${centavos > 0 ? "+" : "−"}${formatMoney(Math.abs(centavos))}`;
}

// The difference says itself in words; its text keeps the one ink (follow-up 285).
export type DifferenceTone = { label: string; tone: TextTone };

export function describeDifference(centavos: number): DifferenceTone {
  if (centavos === 0) return { label: "Cuadra", tone: "ink" };
  return { label: centavos < 0 ? "Falta efectivo" : "Sobra efectivo", tone: "ink" };
}

// «Cuadra», «Falta Bs 10,00», «Sobra Bs 5,50»: the difference as Cerrar caja reads it (FIX-083).
export function differenceValue(centavos: number): string {
  if (centavos === 0) return "Cuadra";
  const amount = formatMoney(Math.abs(centavos));
  return centavos < 0 ? `Falta ${amount}` : `Sobra ${amount}`;
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
