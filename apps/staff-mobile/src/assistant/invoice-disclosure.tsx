import {
  Chevron,
  colors,
  fontFamilies,
  Glyph,
  InvoiceDataCard,
  type InvoiceChoice,
  radii,
  spacing,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * S10's «¿Necesita factura?» (walkthrough 14): folded, the sale goes without
 * an invoice; opened, the shared invoice card asks for the NIT or CI.
 */
export function InvoiceDisclosure({
  onChange,
  value,
}: {
  onChange: (choice: InvoiceChoice) => void;
  value: InvoiceChoice;
}) {
  const open = value.wantsInvoice;
  return (
    <View style={styles.block}>
      <Pressable
        accessibilityLabel="¿Necesita factura? Por defecto, sin factura"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => onChange({ ...value, wantsInvoice: !open })}
        style={styles.row}
        testID="invoice-disclosure"
      >
        <View style={styles.disc}>
          <Glyph color={colors.primary} name="card" size={18} strokeWidth={1.5} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>¿Necesita factura?</Text>
          <Text style={styles.note}>Por defecto, sin factura</Text>
        </View>
        <Chevron size={16} strokeWidth={1.5} tone="muted" />
      </Pressable>
      {open ? (
        <InvoiceDataCard
          noInvoiceNote="La venta se registra sin datos de factura."
          onChange={onChange}
          prefilledNote="Datos de su última compra. Confírmalos con la clienta."
          value={value}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  body: { flex: 1, gap: spacing.xxs },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  row: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.card,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
  },
  title: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 16 },
});
