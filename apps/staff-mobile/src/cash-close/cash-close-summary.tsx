import { formatMoney } from "@pilates/api-contracts";
import type { CashCloseDto } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  PrimaryButton,
  spacing,
  StateScreen,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { clockTime } from "../nutritionist/nutritionist-format";
import { RowCard } from "../profile/card-pieces";
import { ValueRow } from "../ui/value-row";
import { CashCloseFrame } from "./cash-close-frame";
import { formatSignedBolivianos } from "./cash-close-format";

/**
 * S25 «Caja cerrada» (E-S07): after recording, or when the day was already
 * closed. Who closed it on a white card, the difference large on a 500 block,
 * the counts on their own card, and the way on in the white footer.
 */
export function CashCloseSummary({
  close,
  doneLabel,
  lead,
  onDone,
  root,
}: {
  close: CashCloseDto;
  doneLabel: string;
  /** What leads the body, such as the Branch chips. */
  lead?: ReactNode;
  onDone: () => void;
  root: boolean;
}) {
  return (
    <CashCloseFrame
      footer={<PrimaryButton label={doneLabel} onPress={onDone} testID="cash-close-done" />}
      root={root}
    >
      {lead}
      <View accessibilityLabel="Caja cerrada">
        <StateScreen
          icon="check"
          layout="card"
          note={`La cerró ${close.closedByName} a las ${clockTime(close.closedAt)}.`}
          title="Caja cerrada"
        />
      </View>
      <View
        accessibilityLabel={`Diferencia, ${formatSignedBolivianos(close.differenceCentavos)}`}
        accessible
        style={styles.difference}
      >
        <Text style={styles.amount}>{formatSignedBolivianos(close.differenceCentavos)}</Text>
        <Text style={styles.label}>Diferencia</Text>
      </View>
      <RowCard>
        <ValueRow label="Efectivo esperado" value={formatMoney(close.expectedCentavos)} />
        <ValueRow label="Efectivo contado" value={formatMoney(close.countedCentavos)} />
        {close.note === null ? null : <ValueRow label="Nota" value={close.note} />}
      </RowCard>
    </CashCloseFrame>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.onMedio,
    fontFamily: fontFamilies.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"],
    lineHeight: 46,
  },
  difference: {
    ...surfaces.medio,
    gap: spacing.xxs,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.lgXl,
  },
  label: {
    color: colors.onMedio,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.titleSmall,
    fontWeight: "700",
  },
});
