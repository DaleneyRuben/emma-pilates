import {
  colors,
  fontFamilies,
  InvoiceDataFields,
  type InvoiceChoice,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * Staff pick E3 C: «Pide factura» as a switch. Off, the sale goes without an
 * invoice; on, it shows the NIT or CI and the name, prefilled from her last
 * sale (PAY-007).
 */
export function InvoiceSwitch({
  onChange,
  value,
}: {
  onChange: (choice: InvoiceChoice) => void;
  value: InvoiceChoice;
}) {
  const on = value.wantsInvoice;
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel="Pide factura"
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        onPress={() => onChange({ ...value, wantsInvoice: !on })}
        style={styles.row}
        testID="invoice-switch"
      >
        <View style={styles.body}>
          <Text style={styles.title}>Pide factura</Text>
          {on ? null : <Text style={styles.note}>Sin factura si no la pide</Text>}
        </View>
        <View style={[styles.track, on && styles.trackOn]}>
          <View style={[styles.thumb, on && styles.thumbOn]} />
        </View>
      </Pressable>
      {on ? (
        <InvoiceDataFields
          onChange={onChange}
          prefilledNote="Datos de su última compra. Confírmalos con la clienta."
          value={value}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.button,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 44 },
  thumb: {
    backgroundColor: colors.border,
    borderRadius: radii.pill,
    height: 20,
    width: 20,
  },
  thumbOn: { alignSelf: "flex-end", backgroundColor: colors.onPrimary },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  track: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 48,
  },
  trackOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
