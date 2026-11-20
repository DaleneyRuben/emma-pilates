import { formatMoney } from "@pilates/api-contracts";
import { EmphasisCard, Text } from "@pilates/mobile-core";

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
        <Text tone="onDark" variant="cifra-grande">
          {formatMoney(summary.centavos)}
        </Text>
        <Text tone="onDark" variant="cuerpo">
          {summary.note}
        </Text>
      </EmphasisCard>
      {receipts.error}
      {receipts.viewer}
    </>
  );
}
