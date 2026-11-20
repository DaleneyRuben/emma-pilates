import { useGetTodayCashClose } from "@pilates/api-contracts";

import { usePendingInvoiceCount } from "../invoices/invoices-screen";
import { useStaffFetcher } from "../staff-fetcher";
import { PlainRow, PlainRowGroup } from "../ui/plain-rows";

function invoicesDetail(count: number): string {
  if (count === 0) return "Nada pendiente";
  return count === 1 ? "1 factura pendiente" : `${count} facturas pendientes`;
}

/**
 * What is still to do at the front desk today (E7 pick A), as Crema rows with
 * an Arcilla border: the invoices to upload (FIX-044) and the Branch's Cash
 * Close. Transfer receipts are confirmed by an Administrator only, so they
 * are not the Assistant's to review here.
 */
export function TodayPending({
  branchId,
  onCashClose,
  onInvoices,
}: {
  branchId: string;
  onCashClose: () => void;
  onInvoices: () => void;
}) {
  const fetcher = useStaffFetcher();
  const invoiceCount = usePendingInvoiceCount();
  const today = useGetTodayCashClose(
    { branchId },
    { fetcher, query: { refetchOnMount: "always" } },
  );
  const closed = today.data?.status === 200 && today.data.data.close !== null;
  return (
    <PlainRowGroup testID="today-pending">
      <PlainRow
        detail={invoicesDetail(invoiceCount)}
        label="Facturas por subir"
        onPress={onInvoices}
        testID="today-invoices"
        value={invoiceCount > 0 ? String(invoiceCount) : undefined}
      />
      <PlainRow
        detail={closed ? "Ya está cerrada" : "Al final del día"}
        label={closed ? "Caja de hoy" : "Cerrar caja"}
        onPress={onCashClose}
        testID="today-cash-close"
      />
    </PlainRowGroup>
  );
}
