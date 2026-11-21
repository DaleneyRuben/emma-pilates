import {
  Chevron,
  colors,
  FormField,
  Glyph,
  type InvoiceChoice,
  spacing,
  Text,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

const taxIdCharacters = /^[0-9A-Za-z\s-]*$/;

/**
 * Walkthrough n.º 14: «¿Necesitas factura?» as a row that opens NIT or CI and
 * the name. Closed means the purchase goes without an invoice.
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
    <View>
      <Pressable
        accessibilityLabel="¿Necesitas factura?"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => onChange({ ...value, wantsInvoice: !open })}
        style={styles.row}
        testID="invoice-disclosure"
      >
        <View style={styles.icon}>
          <Glyph color={colors.text} name="receipt" size={18} strokeWidth={1.7} />
        </View>
        <Text style={styles.label} variant="titulo-fila">
          ¿Necesitas factura?
        </Text>
        <Chevron direction={open ? "up" : "down"} size={18} strokeWidth={1.7} tone="muted" />
      </Pressable>
      {open ? (
        <View style={styles.fields}>
          <FormField
            autoCapitalize="characters"
            autoCorrect={false}
            error={
              taxIdCharacters.test(value.taxId) ? undefined : "Usa solo números, letras y guiones."
            }
            label="NIT o CI"
            maxLength={20}
            onChangeText={(taxId) => onChange({ ...value, taxId })}
            testID="invoice-tax-id"
            value={value.taxId}
          />
          <FormField
            autoCapitalize="words"
            autoCorrect={false}
            label="Nombre o razón social"
            maxLength={120}
            onChangeText={(name) => onChange({ ...value, name })}
            testID="invoice-name"
            value={value.name}
          />
          {value.prefilled ? (
            <Text variant="secundario">
              Usamos los datos de tu última compra. Puedes cambiarlos.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Rosa Emma C10: the glyph on a 36 pt 50 disc.
  icon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  fields: { gap: spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  label: { flex: 1 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
});
