import {
  BodyText,
  colors,
  FormField,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** The tax identity a front-desk receipt may carry (PAY-007's fields). */
export type InvoiceData = { taxId: string; name: string };

export type InvoiceChoice = {
  wantsInvoice: boolean;
  taxId: string;
  name: string;
};

const taxIdMaxLength = 20;
const nameMaxLength = 120;
const taxIdCharacters = /^[0-9A-Za-z\s-]*$/;

/** «Sin factura» until the Assistant chooses otherwise. No prefill on this branch. */
export const invoiceChoiceFrom = (): InvoiceChoice => ({
  wantsInvoice: false,
  taxId: "",
  name: "",
});

/**
 * What a later reconcile with PAY-007 would send. This branch does not
 * persist it: the card is the front-desk shape only.
 */
export const invoiceDataPayload = (
  choice: InvoiceChoice,
): InvoiceData | null | "incomplete" => {
  if (!choice.wantsInvoice) return null;
  const taxId = choice.taxId.trim();
  const name = choice.name.trim();
  if (taxId === "" || name === "" || !taxIdCharacters.test(taxId) || !/\d/.test(taxId)) {
    return "incomplete";
  }
  return { taxId, name };
};

function ChoicePill({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The smallest «Datos para la factura» card matching PAY-007: NIT or CI and a
 * name, both optional, «Sin factura» allowed. Reconcile with PAY-007's
 * component when both merge.
 */
export function InvoiceDataCard({
  onChange,
  value,
}: {
  value: InvoiceChoice;
  onChange: (choice: InvoiceChoice) => void;
}) {
  const taxIdInvalid = value.wantsInvoice && !taxIdCharacters.test(value.taxId);

  return (
    <View style={styles.card} testID="invoice-data-card">
      <Text style={styles.title}>Datos para la factura</Text>
      <View style={styles.pills}>
        <ChoicePill
          label="Con factura"
          onPress={() => onChange({ ...value, wantsInvoice: true })}
          selected={value.wantsInvoice}
        />
        <ChoicePill
          label="Sin factura"
          onPress={() => onChange({ ...value, wantsInvoice: false })}
          selected={!value.wantsInvoice}
        />
      </View>
      {value.wantsInvoice ? (
        <View style={styles.fields}>
          <FormField
            autoCapitalize="characters"
            autoCorrect={false}
            error={taxIdInvalid ? "Usa solo números, letras y guiones." : undefined}
            label="NIT o CI"
            maxLength={taxIdMaxLength}
            onChangeText={(taxId) => onChange({ ...value, taxId })}
            testID="invoice-tax-id"
            value={value.taxId}
          />
          <FormField
            autoCapitalize="words"
            autoCorrect={false}
            label="Nombre o razón social"
            maxLength={nameMaxLength}
            onChangeText={(name) => onChange({ ...value, name })}
            testID="invoice-name"
            value={value.name}
          />
        </View>
      ) : (
        <BodyText style={styles.note}>Esta venta queda sin factura.</BodyText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  fields: { gap: spacing.md },
  note: { color: colors.textMuted, fontSize: typography.note },
  pill: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  pillLabel: { color: colors.textSecondary, fontSize: 14 },
  pillLabelSelected: { color: colors.white },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pills: { flexDirection: "row", gap: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: "500" },
});
