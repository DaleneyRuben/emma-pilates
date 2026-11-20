import {
  colors,
  fontFamilies,
  InvoiceDataFields,
  type InvoiceChoice,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * Staff pick E3 C (E-P02, E-P03): «Pide factura» as a switch on a white
 * card. Off, the sale goes without an invoice; on, it shows the NIT or CI and
 * the name, prefilled from her last sale (PAY-007).
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
    ...surfaces.card,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  note: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 44 },
  // Off: a 400 thumb on a 50 track ringed in 400 (no 200 fill, FIX-089);
  // on: a white thumb on 600.
  thumb: {
    backgroundColor: colors.borderStrong,
    borderRadius: radii.pill,
    height: 23,
    width: 23,
  },
  thumbOn: { alignSelf: "flex-end", backgroundColor: colors.onPrimary },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.bodyMedium,
    fontWeight: "700",
  },
  track: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 52,
  },
  trackOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
