import { formatMoney } from "@pilates/api-contracts";

/**
 * FIX-090 (owner 2026-11-19): «Bs 1.534,90», and «Bs 450» when the decimals
 * are ,00, the one money format of every surface. Amounts are centavos.
 */
export function formatBolivianos(centavos: number): string {
  return formatMoney(centavos);
}
