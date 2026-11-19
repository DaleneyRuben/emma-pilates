import type { AdminPaymentDto } from "@pilates/api-contracts";
import { useState } from "react";
import { RowMenu, type RowMenuItem } from "../components/ui/row-menu";
import { VoidSaleDialog } from "./void-sale-dialog";

/** A sale whose invoice still has to be uploaded (FIX-044). */
const canUploadInvoice = (payment: AdminPaymentDto) =>
  payment.state === "confirmed" &&
  payment.invoiceData !== null &&
  payment.invoiceFile === null;

const invoiceItem = (payment: AdminPaymentDto): string | null => {
  if (payment.state === "pending") return null;
  if (canUploadInvoice(payment)) return "Subir factura";
  return payment.invoiceData !== null || payment.invoiceFile !== null
    ? "Ver factura"
    : null;
};

/**
 * FIX-091 (W4 B): a Payment row's secondary actions behind «⋯»: review the
 * receipt of a transfer, upload or see the invoice (both open the row's
 * panel), and «Anular venta» on a confirmed Plan sale.
 */
export function PaymentRowMenu({
  payment,
  onOpen,
}: {
  payment: AdminPaymentDto;
  onOpen: () => void;
}) {
  const [voiding, setVoiding] = useState(false);
  const invoice = invoiceItem(payment);
  const items: RowMenuItem[] = [
    ...(payment.state === "pending"
      ? [{ label: "Revisar comprobante", onSelect: onOpen }]
      : []),
    ...(invoice === null ? [] : [{ label: invoice, onSelect: onOpen }]),
    ...(payment.state === "confirmed" && payment.kind !== "evaluation"
      ? [{ label: "Anular venta", onSelect: () => setVoiding(true) }]
      : []),
  ];

  return (
    <>
      <RowMenu label={`Acciones de ${payment.clientName}`} items={items} />
      {voiding ? (
        <VoidSaleDialog
          paymentId={payment.id}
          clientName={payment.clientName}
          open
          onOpenChange={setVoiding}
        />
      ) : null}
    </>
  );
}
