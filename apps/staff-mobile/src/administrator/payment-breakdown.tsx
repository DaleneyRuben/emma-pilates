import { formatMoney } from "@pilates/api-contracts";
import { discountPercent } from "@pilates/mobile-core";

import { RowCard } from "../profile/card-pieces";
import { ValueRow } from "../ui/value-row";

// Walkthrough n.º 73: a discounted Plan shows what she saw paying, in C09's
// «Desglose» words, on the rows S10's «A cobrar» uses. A full price needs none.
export function PaymentBreakdown({
  payment,
}: {
  payment: { planPriceCentavos: number; discountCentavos?: number; amountDueCentavos: number };
}) {
  const discount = payment.discountCentavos ?? 0;
  if (discount <= 0) return null;
  const percent = discountPercent({
    listPriceCentavos: payment.planPriceCentavos,
    priceCentavos: payment.planPriceCentavos - discount,
  });
  return (
    <RowCard label="Desglose">
      <ValueRow label="Precio del plan" value={formatMoney(payment.planPriceCentavos)} />
      <ValueRow
        label={percent === null ? "Descuento" : `Descuento ${percent} %`}
        tone="emphasis"
        value={`−${formatMoney(discount)}`}
      />
      <ValueRow label="Total" strong value={formatMoney(payment.amountDueCentavos)} />
    </RowCard>
  );
}
