import { colors, EmphasisCard, fontFamilies } from "@pilates/mobile-core";
import { StyleSheet, Text } from "react-native";

import { formatExactBolivianos } from "../ui/exact-bolivianos";
import type { PaySummary } from "./pay-ledger";
import { useReceiptViewer } from "./receipt-viewer";

/** Finding 111, proposal B: the screen's one Rosa profundo card. */
export function PaySummaryCard({ summary }: { summary: PaySummary }) {
  const receipts = useReceiptViewer();
  const { receipt } = summary;
  return (
    <>
      <EmphasisCard
        action={
          receipt === null
            ? undefined
            : { label: "Ver comprobante", onPress: () => receipts.show(receipt) }
        }
        eyebrow={summary.eyebrow}
        testID="pay-summary"
      >
        <Text style={styles.total}>{formatExactBolivianos(summary.centavos)}</Text>
        <Text style={styles.note}>{summary.note}</Text>
      </EmphasisCard>
      {receipts.error}
      {receipts.viewer}
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: -6,
  },
  total: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 36,
    fontVariant: ["tabular-nums"],
    lineHeight: 42,
  },
});
