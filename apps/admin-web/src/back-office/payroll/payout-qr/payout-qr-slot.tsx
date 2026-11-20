import type { PayoutQrResultDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { PayoutQrCard, type PayoutQrView } from "./payout-qr-card";
import { payoutQrQueryOptions } from "./payout-qr-queries";

const toView = (result: PayoutQrResultDto): PayoutQrView | null => {
  const qr = result.payoutQr;
  if (qr === null) return null;
  return qr.standing === "expired" || qr.imageUrl === null
    ? { standing: "expired", validUntil: qr.validUntil, imageUrl: null }
    : {
        standing: qr.standing,
        validUntil: qr.validUntil,
        imageUrl: qr.imageUrl,
      };
};

/**
 * FIX-072, follow-up 276: the person's payout QR wherever Sueldos pays her:
 * Pagados' «Registrar pago» and the «Aprobar pago» confirmation (FIX-070).
 */
export function PayoutQrSlot({
  staffMemberId,
  staffName,
}: {
  staffMemberId: string;
  staffName: string;
}) {
  const qr = useQuery(payoutQrQueryOptions(staffMemberId));

  if (qr.isPending) {
    return (
      <div
        aria-hidden="true"
        className="h-[290px] animate-pulse rounded-tarjeta bg-superficie shadow-tarjeta"
      />
    );
  }
  if (qr.isError) {
    return (
      <p className="text-nota text-texto">No pudimos cargar su QR de cobro.</p>
    );
  }
  return <PayoutQrCard staffName={staffName} qr={toView(qr.data)} />;
}
