import { formatMoney, useListCurrentStaffSalaryPayments } from "@pilates/api-contracts";

import { useStaffFetcher } from "../staff-fetcher";

/**
 * E8 B: «Último: Bs 410» at the end of the Assistant's «Mis pagos» row in
 * Perfil, from her newest Salary Payment; nothing until she has one.
 */
export function useLastPaymentNote(enabled: boolean): string | undefined {
  const fetcher = useStaffFetcher();
  const payments = useListCurrentStaffSalaryPayments({
    fetcher,
    query: { enabled, refetchOnMount: "always" },
  });
  if (!enabled || payments.data?.status !== 200) return undefined;
  const [last] = payments.data.data;
  return last === undefined ? undefined : `Último: ${formatMoney(last.amountCentavos)}`;
}
