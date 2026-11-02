import type { CashCloseDto } from "@pilates/api-contracts";
import { IconRowGroup, StateScreen } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { clockTime } from "../nutritionist/nutritionist-format";
import { ValueRow } from "../ui/value-row";
import { formatCashCloseBolivianos, formatSignedBolivianos } from "./cash-close-format";

// S25 «Caja cerrada» (v2): after recording, or when the day was already closed.
export function CashCloseSummary({
  close,
  doneLabel,
  onDone,
}: {
  close: CashCloseDto;
  doneLabel: string;
  onDone: () => void;
}) {
  return (
    <View accessibilityLabel="Caja cerrada">
      <StateScreen
        icon="check"
        layout="inList"
        note={`La cerró ${close.closedByName} a las ${clockTime(close.closedAt)}.`}
        primaryAction={{ label: doneLabel, onPress: onDone, testID: "cash-close-done" }}
        title="Caja cerrada"
      >
        <View style={styles.rows}>
          <IconRowGroup>
            <ValueRow
              label="Efectivo esperado"
              value={formatCashCloseBolivianos(close.expectedCentavos)}
            />
            <ValueRow
              label="Efectivo contado"
              value={formatCashCloseBolivianos(close.countedCentavos)}
            />
            <ValueRow label="Diferencia" value={formatSignedBolivianos(close.differenceCentavos)} />
            {close.note === null ? null : <ValueRow label="Nota" value={close.note} />}
          </IconRowGroup>
        </View>
      </StateScreen>
    </View>
  );
}

const styles = StyleSheet.create({ rows: { alignSelf: "stretch" } });
