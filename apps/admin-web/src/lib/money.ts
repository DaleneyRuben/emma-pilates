import { formatMoney } from "@pilates/api-contracts";

/**
 * ADR-0082: every Money Amount is an integer number of BOB centavos. FIX-090
 * (owner 2026-11-19): every screen writes it as the apps do, «Bs 1.534,90»
 * and «Bs 450» when the decimals are ,00.
 */
export const formatBolivianos = (centavos: number): string =>
  formatMoney(centavos);

/**
 * Reads a typed amount into centavos. The comma is the decimal separator
 * and dots group thousands, except a lone dot followed by one or two digits,
 * which someone typing on an English keyboard means as the decimal point.
 */
export function parseBolivianos(text: string): number | null {
  let value = text.trim().replace(/^Bs\s*/i, "");
  if (!value.includes(",") && /^\d+\.\d{1,2}$/.test(value)) {
    value = value.replace(".", ",");
  }
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(value);
  if (match === null) return null;
  const whole = Number.parseInt((match[1] ?? "").replaceAll(".", ""), 10);
  const fraction = Number.parseInt((match[2] ?? "0").padEnd(2, "0"), 10);
  return whole * 100 + fraction;
}

/** A net figure: "−Bs 1.200" below zero, the plain amount otherwise. */
export const formatSignedBolivianos = (centavos: number): string =>
  formatMoney(centavos);
