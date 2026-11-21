import { Pressable, StyleSheet, View } from "react-native";

import { FormField } from "../ui/form-field";
import { Text } from "../ui/text";
import { colors, radii, spacing, surfaces } from "../ui/tokens";

/** The tax identity on a sale's invoice (booking glossary «Invoice Data»). */
export type InvoiceData = { taxId: string; name: string };

export type InvoiceChoice = {
  wantsInvoice: boolean;
  taxId: string;
  name: string;
  /** Whether the fields came from the Client's last sale. */
  prefilled: boolean;
};

const taxIdMaxLength = 20;
const nameMaxLength = 120;
// The API's rule: digits, letters, and hyphens, with at least one digit.
const taxIdCharacters = /^[0-9A-Za-z\s-]*$/;

/** «Con factura» with the last sale's data, or «Sin factura» when there is none. */
export const invoiceChoiceFrom = (prefill: InvoiceData | null): InvoiceChoice =>
  prefill === null
    ? { wantsInvoice: false, taxId: "", name: "", prefilled: false }
    : { wantsInvoice: true, taxId: prefill.taxId, name: prefill.name, prefilled: true };

/** What the sale sends: the data, `null` for «Sin factura», or `incomplete`. */
const isValidTaxId = (taxId: string) => taxIdCharacters.test(taxId) && /\d/.test(taxId);

export const invoiceDataPayload = (choice: InvoiceChoice): InvoiceData | null | "incomplete" => {
  if (!choice.wantsInvoice) return null;
  const taxId = choice.taxId.trim();
  const name = choice.name.trim();
  if (taxId === "" || name === "" || !isValidTaxId(taxId)) return "incomplete";
  return { taxId, name };
};

/**
 * Why an opened invoice holds the sale back (walkthrough n.º 23, follow-up
 * 246 C10c): a missing or invalid NIT or CI first, then the name; `null`
 * once it is complete.
 */
export const invoiceIncompleteNote = (choice: InvoiceChoice): string | null => {
  if (invoiceDataPayload(choice) !== "incomplete") return null;
  const taxId = choice.taxId.trim();
  if (taxId === "") return "Completa el NIT o CI, o cierra la factura";
  if (!isValidTaxId(taxId)) return "Revisa el NIT o CI, o cierra la factura";
  return "Completa el nombre o razón social, o cierra la factura";
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
      <Text tone={selected ? "onDark" : "ink"} variant="compacto">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * PAY-007, design follow-ups 145 (`10`) and 146 (`S10`): the «Datos para la
 * factura» card of every sale, «Con factura» with NIT or CI and a name, or
 * «Sin factura».
 */
export function InvoiceDataCard({
  noInvoiceNote,
  onChange,
  prefilledNote,
  raised = false,
  value,
}: {
  value: InvoiceChoice;
  onChange: (choice: InvoiceChoice) => void;
  noInvoiceNote: string;
  prefilledNote: string;
  /** `S10`'s cards carry the soft shadow; `10`'s are flat. */
  raised?: boolean;
}) {
  return (
    <View style={[raised ? styles.raised : styles.card]} testID="invoice-data-card">
      <Text variant="titulo-fila">Datos para la factura</Text>
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
        <InvoiceDataFields onChange={onChange} prefilledNote={prefilledNote} value={value} />
      ) : (
        <Text variant="secundario">{noInvoiceNote}</Text>
      )}
    </View>
  );
}

/**
 * The NIT or CI and the name of an invoice, and whose last sale filled them:
 * the card above and the staff «Pide factura» switch (pick E3 C) both draw it.
 */
export function InvoiceDataFields({
  onChange,
  prefilledNote,
  value,
}: {
  value: InvoiceChoice;
  onChange: (choice: InvoiceChoice) => void;
  prefilledNote: string;
}) {
  const taxIdInvalid = !taxIdCharacters.test(value.taxId);
  return (
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
      {value.prefilled ? <Text variant="secundario">{prefilledNote}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.flatCard, gap: spacing.mdLg, padding: spacing.xlSm },
  fields: { gap: spacing.md },
  pill: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pills: { flexDirection: "row", gap: spacing.sm },
  raised: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
});
