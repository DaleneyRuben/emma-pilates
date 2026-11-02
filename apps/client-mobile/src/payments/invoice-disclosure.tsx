import {
  BodyText,
  Chevron,
  colors,
  fontFamilies,
  FormField,
  Glyph,
  type InvoiceChoice,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
        <View style={styles.disc}>
          <Glyph name="receipt" size={18} strokeWidth={1.5} />
        </View>
        <Text style={styles.label}>¿Necesitas factura?</Text>
        <Chevron direction={open ? "up" : "down"} size={16} strokeWidth={1.5} tone="muted" />
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
            <BodyText style={styles.note}>
              Usamos los datos de tu última compra. Puedes cambiarlos.
            </BodyText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  fields: { gap: spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  label: {
    color: colors.text,
    flex: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.bodyMedium,
  },
  note: { color: colors.textMuted, fontSize: typography.note },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
});
