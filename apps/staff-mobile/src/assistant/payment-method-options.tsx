import { colors, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { CardLabel } from "../ui/card-pieces";

export type PaymentMethod = "cash" | "qr";

const options: { key: PaymentMethod; label: string; next: string }[] = [
  { key: "cash", label: "Efectivo", next: "Entra a la caja de hoy" },
  { key: "qr", label: "QR", next: "Subes el comprobante" },
];

/**
 * Staff pick E3 C: «Cómo paga» as two large options, each saying what happens
 * next, on a white card under its label (E-P02). White with a 400 outline;
 * the chosen one 600 with white text. The way closed by a pending payment is
 * off (FIX-028).
 */
export function PaymentMethodOptions({
  lockedTo,
  onSelect,
  selected,
}: {
  lockedTo: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  selected: PaymentMethod;
}) {
  return (
    <View style={styles.card}>
      <CardLabel>Cómo paga</CardLabel>
      <View accessibilityLabel="Cómo paga" accessibilityRole="radiogroup" style={styles.row}>
        {options.map((option) => {
          const disabled = lockedTo !== null && lockedTo !== option.key;
          // A closed way is never drawn as chosen, and says why it is off.
          const filled = option.key === selected && !disabled;
          const next = disabled ? "Hay un pago en revisión" : option.next;
          return (
            <Pressable
              accessibilityLabel={`${option.label}. ${next}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: option.key === selected, disabled }}
              disabled={disabled}
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={[styles.option, filled && styles.chosen]}
              testID={`payment-method-${option.key}`}
            >
              <Text tone={filled ? "onDark" : "ink"} variant="titulo-fila">
                {option.label}
              </Text>
              <Text tone={filled ? "onDark" : "ink"} variant="secundario">
                {next}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smLg, padding: spacing.lg },
  chosen: { backgroundColor: colors.primary, borderColor: colors.primary },
  option: {
    backgroundColor: colors.card,
    borderColor: colors.borderStrong,
    borderRadius: radii.button,
    borderWidth: 1.5,
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: { flexDirection: "row", gap: spacing.md },
});
