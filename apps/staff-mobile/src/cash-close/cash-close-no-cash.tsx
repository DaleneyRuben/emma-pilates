import type { CashCloseDto } from "@pilates/api-contracts";
import {
  colors,
  ConfirmationSheet,
  fontFamilies,
  NoticeRow,
  PrimaryButton,
  spacing,
  surfaces,
  TextButton,
  typography,
} from "@pilates/mobile-core";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useRecordCashClose } from "./cash-close-form";

/**
 * FIX-083 (Cerrar caja pick C): a day with no cash Payments is not a problem
 * to solve. It closes in zero, unless there is cash in the drawer after all.
 */
export function CashCloseNoCash({
  branch,
  fetcher,
  onClosed,
  onHasCash,
}: {
  branch: { id: string; name: string };
  fetcher: typeof globalThis.fetch;
  onClosed: (close: CashCloseDto | null, failure: string | null) => Promise<void>;
  onHasCash: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { failure, record, submitting } = useRecordCashClose(branch.id, fetcher, onClosed);
  return (
    <>
      <View style={styles.card} testID="cash-close-no-cash">
        <Text accessibilityRole="header" style={styles.title}>
          Hoy no hubo pagos en efectivo
        </Text>
        <Text style={styles.note}>Puedes cerrar la caja en cero.</Text>
      </View>
      {failure === null ? null : (
        <View accessibilityLabel={failure} accessibilityRole="alert">
          <NoticeRow message={failure} />
        </View>
      )}
      <View style={styles.actions}>
        <PrimaryButton
          label="Cerrar caja sin efectivo"
          onPress={() => setConfirming(true)}
          testID="cash-close-zero"
        />
        <TextButton
          label="Sí hay efectivo en la caja"
          onPress={onHasCash}
          style={styles.secondary}
          testID="cash-close-has-cash"
        />
      </View>
      <ConfirmationSheet
        busy={submitting}
        confirmLabel="Cerrar caja"
        confirmTestID="cash-close-confirm"
        note={`Cerrarás la caja de ${branch.name} en Bs 0,00. Un cierre no se puede deshacer.`}
        onConfirm={() =>
          void record(0, null).then(() => {
            setConfirming(false);
          })
        }
        onDismiss={() => setConfirming(false)}
        title="¿Cerrar la caja de hoy?"
        tone="primary"
        visible={confirming}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  card: {
    ...surfaces.card,
    alignItems: "center",
    gap: spacing.smLg,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.xxl,
  },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: "center",
  },
  secondary: { alignSelf: "center" },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 22,
    textAlign: "center",
  },
});
