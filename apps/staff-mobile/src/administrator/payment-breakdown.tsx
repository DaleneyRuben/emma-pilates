import {
  discountPercent,
  formatBolivianos,
  IconRowGroup,
  SectionTitle,
} from "@pilates/mobile-core";
import { View } from "react-native";

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
    <View>
      <SectionTitle>Desglose</SectionTitle>
      <IconRowGroup>
        <ValueRow label="Precio del plan" value={formatBolivianos(payment.planPriceCentavos)} />
        <ValueRow
          label={percent === null ? "Descuento" : `Descuento ${percent} %`}
          tone="emphasis"
          value={`−${formatBolivianos(discount)}`}
        />
        <ValueRow label="Total" strong value={formatBolivianos(payment.amountDueCentavos)} />
      </IconRowGroup>
    </View>
  );
}
