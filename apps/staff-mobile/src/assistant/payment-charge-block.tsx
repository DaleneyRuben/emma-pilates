import { formatMoney, type PlanQuoteDto } from "@pilates/api-contracts";
import {
  ClientFace,
  colors,
  fontFamilies,
  initials,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { describeClasses } from "./assistant-format";

/** What a founder price takes off the list price, or 0. */
export const quoteDiscount = (quote: PlanQuoteDto): number =>
  quote.listPriceCentavos !== undefined && quote.listPriceCentavos > quote.priceCentavos
    ? quote.listPriceCentavos - quote.priceCentavos
    : 0;

/**
 * Staff pick E3 C (E-P02): what is collected, on top, as the 600 hero. Her
 * initials in a white circle (or her photo), the Plan, «A cobrar» large, and
 * the list price and the discount on the right. Credit is retired (PAY-005):
 * the amount is the full price.
 */
export function PaymentChargeBlock({
  clientName,
  clientPhoto,
  quote,
}: {
  clientName: string;
  clientPhoto: { imageAssetId: string } | null;
  quote: PlanQuoteDto;
}) {
  const fetcher = useStaffFetcher();
  const discount = quoteDiscount(quote);
  return (
    <View style={styles.block} testID="payment-charge-block">
      <View style={styles.who}>
        {clientPhoto === null ? (
          <View style={styles.circle}>
            <Text style={styles.initials}>{initials(clientName)}</Text>
          </View>
        ) : (
          <ClientFace fetcher={fetcher} name={clientName} photo={clientPhoto} size={32} />
        )}
        <Text style={styles.name}>{`${clientName} · ${quote.name}`}</Text>
      </View>
      <View style={styles.bottom}>
        <View>
          <Text style={styles.label}>A cobrar</Text>
          <Text style={styles.amount}>{formatMoney(quote.priceCentavos)}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLine}>
            {`${describeClasses(quote.classAllowance)} · ${formatMoney(
              quote.listPriceCentavos ?? quote.priceCentavos,
            )}`}
          </Text>
          {discount > 0 ? (
            <Text style={styles.detailLine}>{`Descuento · −${formatMoney(discount)}`}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    lineHeight: 46,
  },
  block: {
    ...surfaces.emphasis,
    gap: spacing.md,
    paddingHorizontal: spacing.lgXl,
    paddingVertical: spacing.lg,
  },
  bottom: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  circle: {
    alignItems: "center",
    backgroundColor: colors.onEmphasis,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  detail: { alignItems: "flex-end", flexShrink: 1, gap: spacing.xs, paddingBottom: spacing.sm },
  detailLine: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    textAlign: "right",
  },
  initials: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "700",
  },
  label: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
  name: {
    color: colors.onEmphasis,
    flex: 1,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyMedium,
    fontWeight: "700",
  },
  who: { alignItems: "center", flexDirection: "row", gap: spacing.md },
});
